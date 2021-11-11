const chars = ['09', 'az', 'AZ', '--', '__'].map(c => c.split('').map((c, i) => c.charCodeAt(0) + i));
const dec = i => i - chars.slice(0, chars.findIndex(c => c[0] <= i && i < c[1]) + 1).flat().slice(0, -1).reduce((a, c) => c - a, 0);
const enc = i => String.fromCharCode(chars.find(c => (i -= c[1] - c[0]) < 0)[1] + i);
const bin = i => [i % 2 ? true : false, ...(i < 2 ? [] : bin(Math.floor(i / 2)))];
const int = b => b.reduce((a, c) => [a[0] + c * a[1], a[1] * 2], [0, 1])[0];
const encode = b => enc(int(b.slice(0, 6))) + (b.length > 6 ? encode(b.slice(6)) : '');
const decode = s => s.split('').map(c => bin(dec(c.charCodeAt(0)))).reduce((a, c) => a.concat(fill(c, 6)), []);
const fill = (a, n) => (a.length > n ? Array(n).fill(true) : a).concat(Array(Math.max(0, n - a.length)).fill(false));
const full = (a, b) => a.slice(0, b.length) + b.slice(a.length);

const init = 'dr8K1' + '0'.repeat(10);

class Data {
    i = 0;
    b = [];
    saves = [];
    loads = [];
    changed = () => {};

    get = (i, n) => int(this.b.slice(i, i + n));
    set = (i, n, v) => Array.isArray(v) ? this.b = this.b.slice(0, i).concat(fill(v, n), this.b.slice(i + n)) : data.set(i, n, bin(v));
    load = () => (this.b = decode(full(window.location.search.slice(1), init)), this.loads.forEach(l => l()));
    save = () => (this.saves.forEach(s => s()), this.store());
    store = () => {
        let q = encode(this.b);
        let i = q.length - 1;
        while (i >= 0 && (q[i] === init[i])) --i;
        q = i >= 0 ? '/?' + q.slice(0, i + 1) : '/';
        history.replaceState(null, '', q);
    }

    init = () => (data.load(), data.store());
}

const data = new Data();

const cnf = (el, q, n, ev, s, v) => {
    v = v || (() => val);
    el = q ? el.querySelector(q) : el;
    let [i, val] = [(data.i += n) - n, 0];
    const save = () => data.set(i, n, v());
    const set = v => s(val = v, el, () => (save(), data.store()));
    data.loads.push(() => set(data.get(i, n)));
    data.saves.push(save);

    if (ev === 0) ev = on => on('click', v => v ? 0 : 1);
    if (ev) ev((e, cb) => el.addEventListener(e, () => set(cb(v()))));
}

export default cnf;
export { data };
