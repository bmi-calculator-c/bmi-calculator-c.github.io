class Num {
    static nums = [];
    static instances = {};
    static get = id => Num.instances[id];
    static system = i => Num.nums.forEach(num => num.system(i));
    static switch = () => Num.nums.forEach(num => num.system(num.i + 1));

    constructor(args, element) {
        this.args = args;
        this.el = element;
        Num.nums.push(this);
        Num.instances[this.el.id] = this;

        this.i = NaN;
        this.min = 0;
        this.max = 0;
        this.cur = 0;
        this.value = 0;
        this.listeners = {};
        this.systems = this.args['units'].length;

        const set = (a, m) => this.args[a] = this.args[a].map(m);
        set('base', a => a.filter(n => n).map(parseFloat).reverse());
        set('max', a => a.map(parseFloat).reverse());
        set('min', a => a.map(parseFloat).reverse());
        set('convert', a => parseFloat(a[0]) || 1);
        set('step', a => parseFloat(a[0]) || 1);
        set('name', a => a.join(','));

        this.range = this.find('input[type=range]');
        this.switch = this.find('.switch');
        this.sub = this.find('button.sub');
        this.add = this.find('button.add');
        this.select = this.find('select');
        this.inputs = [];

        if (this.systems < 2) this.switch.remove();
        else this.event(this.switch, 'click', () => this.system(this.i + 1));
        this.event(this.range, 'input', () => this.input(parseInt(this.range.value), this.range));
        this.event(this.select, 'input', () => this.input(parseInt(this.select.value), this.select));

        const add = () => this.input(plus(this.cur, this.arg('step')), this.add);
        const sub = () => this.input(minus(this.cur, this.arg('step')), this.sub);
        const minus = (v, s) => v > 0 ? offset(this.int(v), -this.int(s)) / this.p : this.min;
        const plus = (v, s) => v > 0 ? offset(this.int(v), this.int(s)) / this.p : this.min;
        const offset = (v, s) => v - (v % s || -Math.min(s, 0)) + Math.max(s, 0);
        this.event(this.sub, 'pointerdown', () => start(this.sub, sub));
        this.event(this.add, 'pointerdown', () => start(this.add, add));
        this.event(this.sub, 'click', sub);
        this.event(this.add, 'click', add);
        const start = (el, f) => {
            let time = 5000 / (this.max - this.min) * this.arg('step');
            let [t, i] = [setTimeout(() => i = setInterval(f, time), 250), NaN];
            ['pointerup', 'pointercancel', 'pointerout'].forEach(ev => el.addEventListener(ev,
                () => (clearTimeout(t), clearInterval(i)),
            { once: true }));
        }
    }

    p = 100;
    val = v => this.int(v) / this.p;
    int = v => Math.round(v * this.p);
    arg = a => this.args[a][Math.min(this.i, this.args[a].length - 1)];

    find = q => this.el.querySelector(q);
    event = (el, ev, cb) => el.addEventListener(ev, cb);
    focus() { this.inputs[this.inputs.length - 1]?.focus(); }

    on(event, listener) { this.listeners[event] = [...this.listeners[event] || [], listener]; }
    emit(event) { this.listeners[event]?.forEach(listener => listener()); }
    input(value, source = null) {
        this.set(value * this.arg('convert'), source);
        this.emit('input');
    }

    spread(value) {
        return this.arg('base').reduce((acc, cur) => ([
            Math.floor(acc[0] / cur), [acc[0] % cur, ...acc[1]]
        ]), [value, []]).flat();
    }

    join(values) {
        return values.reduce((acc, cur, i) => ([
            acc[0] + acc[1] * cur, acc[1] * (acc[2][i] || 1), acc[2]
        ]), [0, 1, this.arg('base')])[0];
    }

    system(i) {
        i %= this.systems;
        if (this.i === i) return;
        this.i = i;
        this.inputs = [];
        const replace = (el, q) => {
            let children = el.querySelectorAll(q);
            children.forEach(child => child.remove());
            let child = children[0].cloneNode(true);
            return (...set) => {
                let clone = child.cloneNode(true);
                set.forEach(([q, p, v]) => (q ? clone.querySelector(q) : clone)[p] = v);
                return clone;
            }
        }

        this.find('.header span').innerHTML = this.arg('name');
        const [units, content] = ['.units', '.content'].map(this.find);
        let [unit, text] = [replace(units, '.unit'), replace(content, 'input[type=text]')];
        this.arg('units').forEach(name => {
            units.append(unit(['span', 'innerHTML', name]));
            const input = text();
            content.prepend(input);
            this.inputs.push(input);
            this.event(input, 'input', () => {
                let v = [0, input.selectionStart, input.selectionEnd].map((i, j, l) => {
                    return '0' + input.value.slice(i, l[++j]).replace(/[^\d\.\,]/g, '');
                }).reduce((acc, cur) => acc.concat([(cur.match(/(\d+|[\.\,]+)/g) || []).map((s, i, l) => {
                    return i % 2 ? (i < l.length - 2 || acc.some(l => l.length > 1)) ? '' : s[s.length - 1] : s;
                })]), []).map(l => l.join('').slice(1));
                input.value = v.join('');
                input.setSelectionRange(v[0].length, v[0].length + v[1].length);
                this.input(this.join(this.inputs.map(i => parseFloat(i.value.replace(',', '.')) || 0)), this.inputs);
            });

            this.event(input, 'focus', () => input.setSelectionRange(0, input.value.length));
            this.event(input, 'blur', () => this.set(this.value));

            let last = this.inputs.length === 1;
            this.event(input, 'keypress', e => {
                if (e.keyCode !== 13) return;
                if (last) this.emit('submit');
                else this.inputs[this.inputs.length - 2].focus();
            });
        });

        this.min = this.join(this.arg('min'));
        this.max = this.join(this.arg('max'));
        this.range.step = this.arg('step');
        this.range.min = this.min;
        this.range.max = this.max;

        const option = replace(this.select, 'option');
        const val = i => Math.round(this.min + i * (this.max - this.min) / 48);
        for (var i = 0, value = this.min; value <= this.max; value = Math.max(++value, val(++i))) {
            this.select.append(option(['', 'value', value], ['', 'innerHTML', this.spread(value).reduce((acc, cur, i) => {
                return acc + (i ? ' ' : '') + Math.round(cur) + this.arg('units')[i];
            }, '')]));
        }
        this.select.append(option(['', 'value', value], ['', 'innerHTML', '...']));

        this.set(this.value);
        this.emit('switch');
    }

    set(value, source = null) {
        this.value = value;
        this.cur = value / this.arg('convert');

        this.range.value = this.cur;
        let options = this.select.childElementCount - 2;
        let pos = (this.cur - this.min) * 98 / (this.max - this.min) + 1;
        this.range.parentElement.style.setProperty('--pos', `${Math.min(Math.max(0, pos), 99)}%`);
        this.select.selectedIndex = Math.min(options + 1, Math.round((this.cur - this.min) / (this.max - this.min) * options));

        let active = source === this.inputs;
        let values = active ? [] : this.spread(this.cur).map(this.val);
        this.inputs.forEach((input, i) => {
            if (!active) input.value = this.val(value) > 0 ? values[values.length - 1 - i] : '';
            this.find(`.units .unit:nth-last-child(${i + 1}) div`).innerHTML = input.value;
        });
    }
}

export default Num;
