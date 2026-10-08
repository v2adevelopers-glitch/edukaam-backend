// Small in-process cache with expiry, for data that is read far more often than it changes
// (RBAC rules, menus, master lists, public counts, admin stats). Each process has its own copy:
// a change made in one process reaches the others when their entry expires.
const store = new Map();
const MAX_ENTRIES = 2000;

exports.remember = async (key, ttlMs, load) => {
    const hit = store.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;

    const value = await load();
    store.delete(key);
    store.set(key, { value, expires: Date.now() + ttlMs });
    // keys built from user input (search terms) must not grow without bound: drop the oldest
    while (store.size > MAX_ENTRIES) store.delete(store.keys().next().value);
    return value;
};

// Stable text for a value used in a cache key; Sequelize operators (symbol keys) included
exports.keyOf = (value) => JSON.stringify(value, (key, v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v) || v instanceof Date) return v;
    const out = {};
    Object.keys(v).sort().forEach(k => { out[k] = v[k]; });
    Object.getOwnPropertySymbols(v).forEach(s => { out[`@${s.description}`] = v[s]; });
    return out;
});

// Drops every entry whose key starts with prefix (after a write that changes it)
exports.invalidate = (prefix) => {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
    }
};
