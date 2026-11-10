const projectUrl = 'https://jyffqjvxerqiasfkvull.supabase.co';
const publishableKey = 'sb_publishable_ff-dHLyCnWTh-ByYenzEUQ_LtB9WwK1';
const ownerKey = 'immigration-practice-sync-owner';
const panel = document.querySelector('#cloud-sync');
const message = panel.querySelector('[role=status]');
const form = panel.querySelector('form');
const logout = panel.querySelector('[data-logout]');
let client;
let owner;
let revision = null;
let acknowledged = new Set();
let busy = false;
let pending = false;
let timer;

function syncEntries(attempts) {
  const entries = {};
  const occurrences = new Map();
  for (const attempt of attempts) {
    const { id, time, roundId, selected, correct } = attempt;
    if (typeof id !== 'string' || typeof correct !== 'boolean' ||
        !Number.isInteger(selected) || selected < 0 || selected > 3) continue;
    const identity = JSON.stringify([id, time ?? null, roundId ?? null, selected, correct]);
    const ordinal = (occurrences.get(identity) ?? 0) + 1;
    occurrences.set(identity, ordinal);
    entries[JSON.stringify([identity, ordinal])] = attempt;
  }
  return entries;
}

function scheduleSync() {
  if (!owner || !bank.questions.length) return;
  pending = true;
  if (busy) return;
  clearTimeout(timer);
  timer = setTimeout(syncNow, 350);
}

async function syncNow() {
  if (!owner || busy) return;
  busy = true;
  pending = false;
  const syncingOwner = owner;
  try {
    const ids = new Set(bank.questions.map(question => question.id));
    const entries = syncEntries(data.attempts.filter(attempt => ids.has(attempt.id)));
    const changes = Object.fromEntries(Object.entries(entries).filter(([id]) => !acknowledged.has(id)));
    const { data: remote, error } = await client.rpc('sync_practice', { changes, known_revision: revision });
    if (owner !== syncingOwner) return;
    if (error || !remote) throw error ?? Error('Missing sync result');
    if (remote.attempts) {
      const result = mergeBackup({ attempts: Object.values(remote.attempts).filter(attempt => ids.has(attempt?.id)) });
      if (result.added) {
        save();
        if ((tab === 'home' || tab === 'mistakes') && !content.contains(document.activeElement)) go(tab);
      }
      acknowledged = new Set(Object.keys(remote.attempts));
    }
    for (const id of Object.keys(changes)) acknowledged.add(id);
    revision = remote.revision;
    message.textContent = '作答紀錄已同步。';
  } catch {
    if (owner === syncingOwner) message.textContent = '同步暫時失敗。已保留本機作答，連線後會再試。';
  } finally {
    busy = false;
    if (pending) scheduleSync();
  }
}

function updateSession(session) {
  const id = session?.user?.id;
  const bound = localStorage.getItem(ownerKey);
  const differentAccount = id && bound && bound !== id;
  const next = differentAccount ? undefined : id;
  if (next !== owner) {
    owner = next;
    revision = null;
    acknowledged = new Set();
  }
  form.hidden = Boolean(id);
  logout.hidden = !id;
  if (differentAccount) {
    message.textContent = '這個瀏覽器的作答已連結另一個帳號。請登出後使用原帳號。';
  } else if (owner) {
    localStorage.setItem(ownerKey, owner);
    scheduleSync();
  } else {
    message.textContent = '用同一個帳號登入手機與電腦，即可同步作答。';
  }
}

async function startCloudSync() {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm');
    client = createClient(projectUrl, publishableKey);
    form.hidden = false;
    client.auth.onAuthStateChange((event, session) => updateSession(session));
  } catch {
    message.textContent = '雲端同步目前無法連線。本機作答仍可使用。';
    return;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const fields = new FormData(form);
    const credentials = { email: fields.get('email').trim(), password: fields.get('password') };
    form.querySelector('fieldset').disabled = true;
    try {
      const signingUp = event.submitter?.value === 'register';
      const result = signingUp
        ? await client.auth.signUp(credentials)
        : await client.auth.signInWithPassword(credentials);
      if (result.error) {
        message.textContent = signingUp ? '無法建立帳號。請確認信箱與密碼，或改用已建立的帳號登入。' : '登入失敗。請確認信箱、密碼和驗證狀態。';
      } else if (!result.data.session) {
        message.textContent = '請開啟信箱中的驗證連結，再回到題庫登入。';
      } else {
        form.reset();
        message.textContent = '已登入，正在同步作答…';
      }
    } catch {
      message.textContent = '登入服務暫時無法連線，請稍後重試。';
    } finally {
      form.querySelector('fieldset').disabled = false;
    }
  });
  logout.addEventListener('click', async () => {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) message.textContent = '暫時無法登出，請稍後重試。';
  });
  window.addEventListener('practice-saved', scheduleSync);
  window.addEventListener('online', scheduleSync);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleSync();
  });
  setInterval(() => {
    if (!document.hidden) scheduleSync();
  }, 20000);
}

startCloudSync();
