import Num from './num.js';
import cnf, { data } from './cnf.js';

const formulas = [
    (_, w, b) => w && b && Math.sqrt(w / b) * 100,
    (h, _, b) => h && b && b * (h / 100) ** 2,
    (h, w, _) => h && w && w / (h / 100) ** 2
];

const tips = bmi => {
    if (bmi <= 5 || bmi >= 105) return 'im glad youre having fun';
    if (bmi < 18.5) return 'you need MORE!';
    if (bmi > 25) return 'you need LESS!';
    return '';
}

const init = () => {
    const NUM = document.querySelector('.num:not(:empty)');
    NUM.remove();

    document.querySelectorAll('.num:empty').forEach(num => {
        num.replaceWith(new Num(['name', 'units', 'min', 'max', 'step', 'base', 'convert'].reduce((acc, cur) => {
            return Object.assign(acc, { [cur]: (num.attributes[cur]?.nodeValue || '').split('/').map(a => a.split(',')) });
        }, {}), (clone => { clone.id = num.id; return clone; })(NUM.cloneNode(true))).el);
    });

    document.querySelector('.bmi .setting .switch').addEventListener('click', Num.switch);
    let systems = ['.metric', '.imperial'].map(s => document.querySelector('.bmi .setting ' + s));
    systems.forEach((s, i) => s.addEventListener('click', () => Num.system(i)));
    Num.nums.forEach(num => num.on('switch', () => {
        let used = Num.nums.reduce((acc, cur) => (acc[cur.i] ||= cur.systems >= 2, acc), []);
        systems.forEach((s, i) => s.classList[used[i] ? 'add' : 'remove']('active'));
    }));

    let [c, o, t] = [NaN, 0, document.querySelector('.bmi .tip span')];
    ['height', 'weight', 'bmi'].map(id => Num.get(id)).forEach((num, i, nums) => {
        num.on('submit', () => nums[(i + 1) % nums.length].focus());
        num.on('input', () => {
            let l = nums.length - 1;
            if (i !== c) [c, o] = [i, l - (i < l ? 0 : 1)];
            let e = nums.reduce((acc, cur, i) => (cur.value || acc.push(i === c ? o : i), acc), []);
            if (e.length < 2) nums[o = e.length ? e[0] : o].set(formulas[o](...nums.map(n => n.value)));
            let tip = nums.every(i => i.value) && tips(nums[l].value);
            t.classList[tip ? 'add' : 'remove']('show');
            if (tip) t.innerHTML = tip;
            data.changed();
        });
    });



    const OPTIONS = document.querySelector('.options');
    cnf(OPTIONS, '.heart', 1, 0, (v, el, s) => (s(), el.className = v ? 'heart' : (rotate(el), 'hearted')));
    cnf(OPTIONS, '.mode', 1, 0, (v, _, s) => (s(), document.documentElement.className = v ? 'light' : 'dark'));
    let [rotating, deg, dir] = [false, 0, Math.random() < 0.5 ? -1 : 1];
    const rotate = (heart, loop) => (loop || !rotating) && (rotating = true) && requestAnimationFrame(() => {
        heart.style.setProperty('--deg', `${deg = (deg += dir) % 360}deg`);
        if (heart.className === 'hearted') rotate(heart, true);
        else rotating = false;
    });



    Num.nums.forEach(num => cnf(null, '', ((num.systems - 1) || '').toString(2).length, null, (v, _, s) => {
        num.on('switch', s);
        num.system(v);
    }, () => num.i));



    let colors = ['--primary', '--secondary'];
    const hsl = i => `hsl(${i}, var(--saturation), var(--lightness))`;
    const COLORS = ['.primary', '.secondary'].map(s => OPTIONS.querySelector(s));
    const MENUS = [COLORS[0].nextElementSibling, COLORS[1].previousElementSibling];
    const [SCHEME, SCHEMES] = ['.scheme', '.schemes'].map(s => OPTIONS.querySelector(s));
    const SLIDERS = MENUS.map(menu => menu.querySelector('input[type=range]'));

    SCHEME.addEventListener('click', () => SCHEME.nextElementSibling.classList.toggle('open'));
    COLORS.forEach((c, i) => c.addEventListener('click', () => MENUS.forEach((menu, j) => menu.classList[i === j ? 'toggle' : 'remove']('open'))));
    SCHEMES.querySelector('.swap').addEventListener('click', () => SLIDERS.map(slider => slider.value).reverse().forEach((value, i) => {
        document.documentElement.style.setProperty(colors[i], hsl(SLIDERS[i].value = value));
        data.changed();
    }));

    const color = p => (v, _, s) => (s(), document.body.style.setProperty(p, v ? 'var(--secondary)' : 'var(--primary)'));
    cnf(SCHEMES, '.sub', 1, 0, color('--num-sub'));
    cnf(SCHEMES, '.add', 1, 0, color('--num-add'));
    cnf(SCHEMES, '.range', 1, 0, color('--range-pos'));
    cnf(SCHEMES, '.select', 1, 0, color('--num-select'));
    cnf(SCHEMES, '.num-switch', 1, 0, color('--num-switch'));
    cnf(SCHEMES, '.name', 1, 0, color('--num-name'));
    cnf(SCHEMES, '.header', 1, 0, color('--header-text'));

    MENUS.forEach((menu, i) => {
        let gradient = 'linear-gradient(to right';
        for (let v = 0; v <= 360; v += 60) gradient += ', ' + hsl(v);
        SLIDERS[i].min = 0, SLIDERS[i].max = 360, SLIDERS[i].style.background = gradient + ')';
        const set = v => (document.documentElement.style.setProperty(colors[i], hsl(SLIDERS[i].value = v)), data.changed());
        menu.querySelector('.random').addEventListener('click', () => set(Math.floor(Math.random() * 360)));
        cnf(SLIDERS[i], '', 9, on => on('input', v => v), set, () => parseInt(SLIDERS[i].value));
    });



    Num.nums.forEach((num, i) => {
        let last = i === Num.nums.length - 1;
        cnf(null, '', 15, null, v => {
            if (!last || !Num.nums.every(i => i.value)) {
                num.set(v / 100);
                num.emit('input');
            }
        }, () => {
            let full = Num.nums.every(i => i.value);
            return full && last ? 0 : Math.round(num.value * 100);
        });
    });



    let inputting = false;
    const option = (q, ev, cb) => OPTIONS.querySelector(q).addEventListener(ev, cb);
    option('.input', 'click', () => inputting !== (inputting = false) ? {} : (Num.nums.find(i => !i.value) || Num.nums[0])?.focus());
    option('.input', 'pointerdown', () => inputting = Num.nums.some(n => n.inputs.includes(document.activeElement)), { passive: true });

    data.init();
    const SAVE = OPTIONS.querySelector('.save');
    const saved = () => SAVE.className = 'saved';
    data.changed = () => SAVE.className = 'save';
    SAVE.addEventListener('click', () => (data.save(), saved()));
    option('.load', 'click', () => (data.load(), saved()));
    saved();
}

window.addEventListener('load', () => setTimeout(init, 0));
