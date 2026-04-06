/**
 * Seedra v1.0 - Algorithm-v1
 * Core Logic & UI Controller
 */

// --- Globale Variablen & UI-Elemente ---
const slider = document.getElementById('lengthSlider');
const lengthDisp = document.getElementById('lengthDisplay');
const indicator = document.getElementById('indicator');
const resultDisplay = document.getElementById('resultDisplay');
const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!$%&*()-_=+[]{}";

// State-Management für Debouncing und Race-Condition-Schutz
let debounceTimer;
let currentCalculationId = 0;

// ==========================================================
// 1. INLINE WEB WORKER SETUP
// ==========================================================
const workerCode = `
    self.onmessage = async function(e) {
        const { text, length, charset, calculationId } = e.data;
        const iterations = 100000;
        
        let hash = new TextEncoder().encode(text);

        // Die rechenintensive Schleife (Proof of Work Style)
        for (let i = 0; i < iterations; i++) {
            hash = await crypto.subtle.digest('SHA-256', hash);
        }

        let hashArray = Array.from(new Uint8Array(hash));
        
        // Falls Länge > 32, brauchen wir mehr Entropie (zweiter Hash-Durchgang)
        if (length > 32) {
            const extra = await crypto.subtle.digest('SHA-256', new Uint8Array(hashArray));
            hashArray = hashArray.concat(Array.from(new Uint8Array(extra)));
        }

        // Passwort aus Hash generieren
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset[hashArray[i] % charset.length];
        }

        self.postMessage({ password, calculationId });
    };
`;

const blob = new Blob([workerCode], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));

// Empfange Ergebnisse vom Worker
worker.onmessage = function(e) {
    const { password, calculationId } = e.data;
    if (calculationId === currentCalculationId) {
        resultDisplay.innerText = password;
        resultDisplay.classList.remove('generating-active');
        updateCrackTimeMetrics(password.length);
    }
};

// ==========================================================
// 2. KERN-LOGIK: DEBOUNCING & ANFRAGE-STEUERUNG
// ==========================================================

function schedulePasswordUpdate() {
    const text = document.getElementById('inputText').value;
    const salt = document.getElementById('inputSalt').value;
    const len = parseInt(slider.value);

    if (!text) {
        resultDisplay.innerText = "...";
        updateCrackTimeMetrics(0);
        return;
    }

    resultDisplay.classList.add('generating-active');
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        const calculationId = ++currentCalculationId;
        worker.postMessage({
            text: text + salt,
            length: len,
            charset: charset,
            calculationId: calculationId
        });
    }, 300);
}

// ==========================================================
// 3. UI & HILFSFUNKTIONEN
// ==========================================================

function syncUIOnly() {
    const val = parseInt(slider.value);
    lengthDisp.innerText = val;
    
    const btns = [
        { id: 'btnS', val: 12, pos: '4px' },
        { id: 'btnL', val: 32, pos: '33.33%' },
        { id: 'btnXL', val: 40, pos: '66.66%' }
    ];
    
    let matched = false;
    btns.forEach((btnObj, index) => {
        const btnEl = document.getElementById(btnObj.id);
        if (val === btnObj.val) {
            btnEl.classList.add('active');
            indicator.style.left = `calc(${btnObj.pos} + 4px)`;
            indicator.style.opacity = "1";
            matched = true;
        } else {
            btnEl.classList.remove('active');
        }
    });

    if (!matched) {
        indicator.style.opacity = "0.3";
    }
}

// Global verfügbare Funktionen für Inline-HTML-Calls
window.applyPreset = function(val) {
    slider.value = val;
    syncUIOnly();
    schedulePasswordUpdate();
};

window.stepLength = function(change) {
    const newVal = parseInt(slider.value) + change;
    if(newVal >= slider.min && newVal <= slider.max) {
        slider.value = newVal;
        syncUIOnly();
        schedulePasswordUpdate();
    }
};

window.pasteFromClipboard = async function() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('inputText').value = text;
        schedulePasswordUpdate();
    } catch(e) { 
        console.error("Clipboard access denied"); 
    }
};

window.copyToClipboard = function(btn) {
    const text = resultDisplay.innerText;
    if (text === "...") return;

    navigator.clipboard.writeText(text).then(() => {
        const oldHTML = btn.innerHTML;
        btn.innerHTML = "Copied! (Wipe in 30s)";
        btn.classList.replace('from-blue-600', 'from-emerald-600');

        setTimeout(() => {
            navigator.clipboard.writeText(""); 
            btn.innerHTML = oldHTML;
            btn.classList.replace('from-emerald-600', 'from-blue-600');
        }, 30000);
    });
};

function formatTime(seconds) {
    if (seconds < 1n) return "Instant";
    const units = [
        { name: "Billion Years", val: 31536000000n },
        { name: "Years", val: 31536000n },
        { name: "Days", val: 86400n },
        { name: "Hrs.", val: 3600n }
    ];
    for (let unit of units) {
        if (seconds >= unit.val) return `> ${seconds/unit.val} ${unit.name}`;
    }
    return "Seconds";
}

function updateCrackTimeMetrics(len) {
    const crackEl = document.getElementById('crackTime');
    const quantumEl = document.getElementById('quantumTime');
    
    if (len === 0) {
        crackEl.innerText = "-";
        quantumEl.innerText = "-";
        return;
    }
    const combinations = BigInt(charset.length) ** BigInt(len);
    crackEl.innerText = formatTime(combinations / 100_000_000_000_000n);
    const qComb = BigInt(Math.floor(Math.sqrt(Number(combinations))));
    quantumEl.innerText = formatTime(qComb / 1_000_000_000n);
}

// ==========================================================
// 4. INITIALISIERUNG & EVENT LISTENERS
// ==========================================================

document.getElementById('inputText').addEventListener('input', schedulePasswordUpdate);
document.getElementById('inputSalt').addEventListener('input', schedulePasswordUpdate);
slider.addEventListener('input', () => {
    syncUIOnly();
    schedulePasswordUpdate();
});

// Initialer UI-Zustand
syncUIOnly();