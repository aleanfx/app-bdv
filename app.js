// === DOM ===
const screenForm = document.getElementById('screen-form');
const screenConfirm = document.getElementById('screen-confirm');
const screenReceipt = document.getElementById('screen-receipt');
const loadingOverlay = document.getElementById('loading-overlay');
const faceidOverlay = document.getElementById('faceid-overlay');
const faceidBox = document.getElementById('faceid-box');
const faceidSvg = document.getElementById('faceid-svg');
const faceidCheck = document.getElementById('faceid-check');

const doc = document.getElementById('documento');
const tel = document.getElementById('telefono');
const monto = document.getElementById('monto');
const concepto = document.getElementById('concepto');
const opType = document.getElementById('op-type');
const bancoSelect = document.getElementById('banco');

const btnPagar = document.getElementById('btn-pagar');
const btnLimpiar = document.getElementById('btn-limpiar');
const btnCloseConfirm = document.getElementById('btn-close-confirm');
const btnConfirmar = document.getElementById('btn-confirmar');
const btnBackTop = document.getElementById('btn-back-top');
const btnBackHome = document.getElementById('btn-back-home');
const btnCopy = document.getElementById('btn-copy');

// === LABELS ===
const lblDoc = document.getElementById('lbl-doc');
const lblTel = document.getElementById('lbl-tel');
const lblMonto = document.getElementById('lbl-monto');
const lblConcepto = document.getElementById('lbl-concepto');

function syncLabel(input, label, isFocused = false) {
    if (input.value.trim() || isFocused) {
        label.classList.add('populated');
    } else {
        label.classList.remove('populated');
    }

    if (input.value.trim()) {
        input.classList.add('has-val');
    } else {
        input.classList.remove('has-val');
    }
}

[
    [doc, lblDoc],
    [tel, lblTel],
    [monto, lblMonto],
    [concepto, lblConcepto]
].forEach(([inp, lbl]) => {
    inp.addEventListener('input', () => syncLabel(inp, lbl, true));
    inp.addEventListener('focus', () => syncLabel(inp, lbl, true));
    inp.addEventListener('blur', () => syncLabel(inp, lbl, false));
});

// === MONTO FORMAT ===
let lastMontoVal = '';
monto.addEventListener('input', (e) => {
    let digits = monto.value.replace(/\D/g, '');
    let oldDigits = lastMontoVal.replace(/\D/g, '');
    
    // Handle backspace properly if only a non-digit was deleted
    if (e.inputType === 'deleteContentBackward') {
        if (digits.length === oldDigits.length && digits.length > 0) {
            digits = digits.slice(0, -1);
        }
    }
    
    if (!digits) {
        monto.value = '';
        lastMontoVal = '';
        syncLabel(monto, lblMonto, true);
        return;
    }
    
    const num = parseInt(digits, 10);
    digits = num.toString();
    
    while (digits.length < 3) {
        digits = '0' + digits;
    }
    
    const integerPart = digits.slice(0, -2);
    const decimalPart = digits.slice(-2);
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    monto.value = formattedInteger + ',' + decimalPart + ' Bs';
    lastMontoVal = monto.value;
    
    syncLabel(monto, lblMonto, true);
});

// === SHOW SCREEN ===
const screens = [screenForm, screenConfirm, screenReceipt];
function show(target) {
    const targetIdx = screens.indexOf(target);
    screens.forEach((s, idx) => {
        if (idx < targetIdx) {
            s.classList.remove('active');
            s.classList.add('prev');
        } else if (idx === targetIdx) {
            s.classList.add('active');
            s.classList.remove('prev');
        } else {
            s.classList.remove('active', 'prev');
        }
    });
}

// === PAGAR ===
btnPagar.addEventListener('click', () => {
    const d = doc.value.trim();
    const t = tel.value.trim();
    const m = monto.value.trim();
    const c = concepto.value.trim();

    if (!d || !t || !m || !c) {
        [doc, tel, monto, concepto].forEach(inp => {
            if (!inp.value.trim()) {
                inp.style.borderColor = '#E91E63';
                inp.style.animation = 'shake .4s ease';
                setTimeout(() => { inp.style.animation = ''; inp.style.borderColor = '#555'; }, 500);
            }
        });
        return;
    }

    // Fill confirm
    let montoTxt = m;
    if (!m.includes('Bs')) {
        const n = parseFloat(m.replace(',', '.'));
        if (!isNaN(n)) montoTxt = n.toFixed(2).replace('.', ',') + ' Bs';
    }
    document.getElementById('c-monto').textContent = montoTxt;
    document.getElementById('c-doc').textContent = d;
    document.getElementById('c-dest').textContent = t;
    document.getElementById('c-banco').textContent = bancoSelect.value;
    document.getElementById('c-concepto').textContent = c;
    document.getElementById('c-title').textContent = 'PagomóvilBDV ' + opType.value;

    show(screenConfirm);
});

// === LIMPIAR ===
btnLimpiar.addEventListener('click', () => {
    [doc, tel, monto, concepto].forEach(inp => { 
        inp.value = ''; 
        inp.classList.remove('has-val');
    });
    [lblDoc, lblTel, lblMonto, lblConcepto].forEach(l => l.classList.remove('populated'));
});

// === CLOSE CONFIRM ===
btnCloseConfirm.addEventListener('click', () => show(screenForm));

// === CONFIRMAR ===
btnConfirmar.addEventListener('click', () => {
    // 1. Mostrar Face ID como overlay del sistema
    faceidOverlay.classList.add('show');
    faceidBox.classList.add('scanning');
    faceidSvg.style.display = 'block';
    faceidCheck.style.display = 'none';
    faceidCheck.classList.remove('animate');

    // Se mantiene en la pantalla "Confirmar" mientras el Face ID escanea (1s)

    // 2. Esperar 1 segundo de escaneo
    setTimeout(() => {
        // Detener escaneo y empezar a dibujar el check
        faceidBox.classList.remove('scanning');
        faceidSvg.style.display = 'none';
        faceidCheck.style.display = 'block';
        faceidCheck.classList.add('animate');
        
        // 3. Justo ahora que validó, la app pasa a "Realizando operación"
        screenConfirm.classList.remove('active');
        screenForm.classList.remove('prev');
        screenForm.classList.add('active'); 
        loadingOverlay.classList.add('show');

        // 4. Dejar el Face ID 1 segundo MÁS luego de que se dibuja completo.
        // Dibujarse toma 0.6s, más 1s extra = 1.6s (1600ms)
        setTimeout(() => {
            faceidOverlay.classList.remove('show');
        }, 1600);

        // 5. El flujo de carga de la app continúa y termina en un tiempo aleatorio
        const randomDelay = Math.floor(Math.random() * 2000) + 1000; // 1s a 3s
        setTimeout(() => {
            loadingOverlay.classList.remove('show');

            // Llenar comprobante
            document.getElementById('r-monto').textContent = document.getElementById('c-monto').textContent;
            document.getElementById('r-fecha').textContent = getDate();
            document.getElementById('r-op').textContent = randNum(12);
            document.getElementById('r-id').textContent = document.getElementById('c-doc').textContent;
            document.getElementById('r-origen').textContent = '0102****' + randNum(4);
            const destVal = document.getElementById('c-dest').textContent;
            document.getElementById('r-destino').textContent = destVal.startsWith('0102') ? destVal : '0102****' + (destVal.length >= 4 ? destVal.slice(-4) : randNum(4));
            document.getElementById('r-banco').textContent = document.getElementById('c-banco').textContent;
            document.getElementById('r-concepto').textContent = document.getElementById('c-concepto').textContent;
            document.getElementById('r-title').textContent = 'Transferencias a terceros';

            show(screenReceipt);
        }, randomDelay);

    }, 1000); // 1 segundo escaneando antes de todo
});

// === BACK BUTTONS ===
btnBackTop.addEventListener('click', goHome);
btnBackHome.addEventListener('click', goHome);

function goHome() {
    [doc, tel, monto, concepto].forEach(inp => { 
        inp.value = ''; 
        inp.classList.remove('has-val');
    });
    [lblDoc, lblTel, lblMonto, lblConcepto].forEach(l => l.classList.remove('populated'));
    show(screenForm);
}

// === COPY ===
btnCopy.addEventListener('click', () => {
    const txt = document.getElementById('r-op').textContent;
    navigator.clipboard.writeText(txt).then(() => {
        btnCopy.querySelector('.material-icons-outlined').textContent = 'check';
        setTimeout(() => {
            btnCopy.querySelector('.material-icons-outlined').textContent = 'content_copy';
        }, 1200);
    });
});

// === HELPERS ===
function randNum(len) {
    let s = '';
    for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
    return s;
}
function getDate() {
    const d = new Date();
    return String(d.getDate()).padStart(2, '0') + '/' +
           String(d.getMonth() + 1).padStart(2, '0') + '/' +
           d.getFullYear();
}
