import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "./firebase.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCbwgiZkx_L-v4EN237L-Ws2pQEj8bR9M4",
  authDomain: "audiora-a88c5.firebaseapp.com",
  projectId: "audiora-a88c5",
  storageBucket: "audiora-a88c5.firebasestorage.app",
  messagingSenderId: "538716802433",
  appId: "1:538716802433:web:e5c7d476bc8f956371ec80"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


    // ── API base URL ──────────────────────────────────────────────────────────
    // Automatically detects whether running locally or on a live server
    const API = 'http://localhost:3000/api/auth';

    // ── Floating music notes ──────────────────────────────────────────────────
    (function () {
        const container = document.getElementById('musicNotes');
        const symbols = ['♩','♪','♫','♬','🎵','🎶'];
        for (let i = 0; i < 16; i++) {
            const n = document.createElement('div');
            n.className = 'note';
            n.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            n.style.left = Math.random() * 100 + 'vw';
            n.style.animationDuration = (12 + Math.random() * 18) + 's';
            n.style.animationDelay    = (Math.random() * 20) + 's';
            n.style.fontSize          = (0.7 + Math.random() * 1.1) + 'rem';
            container.appendChild(n);
        }
    })();

    // ── Redirect if already logged in ────────────────────────────────────────
    if (localStorage.getItem('bs_token')) { window.location.replace('index.html'); }

    // ── Tab switch ────────────────────────────────────────────────────────────
    function switchTab(tab) {
        const isLogin = tab === 'login';
        document.getElementById('loginTab').classList.toggle('active', isLogin);
        document.getElementById('signupTab').classList.toggle('active', !isLogin);
        document.getElementById('tabSlider').classList.toggle('to-right', !isLogin);
        document.getElementById('loginPanel').style.display  = isLogin ? '' : 'none';
        document.getElementById('signupPanel').style.display = isLogin ? 'none' : '';
        document.getElementById('authFooterNote').innerHTML = isLogin
            ? `Don't have an account? <a href="#" onclick="switchTab('signup');return false;">Sign up free</a>`
            : `Already have an account? <a href="#" onclick="switchTab('login');return false;">Sign in</a>`;
        clearAllToasts();
    }

    // ── Password toggle ───────────────────────────────────────────────────────
    function togglePw(id, btn) {
        const input = document.getElementById(id);
        const icon  = btn.querySelector('i');
        if (input.type === 'password') { input.type = 'text'; icon.className = 'fa-solid fa-eye-slash'; }
        else                           { input.type = 'password'; icon.className = 'fa-solid fa-eye'; }
    }

    // ── Password strength ─────────────────────────────────────────────────────
    function updateStrength(val) {
        const bar   = document.getElementById('strengthBar');
        const fill  = document.getElementById('strengthFill');
        const label = document.getElementById('strengthLabel');
        bar.style.display = val.length ? 'block' : 'none';
        let score = 0;
        if (val.length >= 8)           score++;
        if (/[A-Z]/.test(val))         score++;
        if (/[0-9]/.test(val))         score++;
        if (/[^A-Za-z0-9]/.test(val))  score++;
        const levels = [
            { w:'25%',  bg:'#f87171', text:'Weak' },
            { w:'50%',  bg:'#fb923c', text:'Fair' },
            { w:'75%',  bg:'#facc15', text:'Good' },
            { w:'100%', bg:'#34d399', text:'Strong ✓' },
        ];
        const l = levels[Math.max(0, score - 1)];
        fill.style.width = l.w; fill.style.background = l.bg;
        label.textContent = val.length ? l.text : ''; label.style.color = l.bg;
    }

    // ── Toast helpers ─────────────────────────────────────────────────────────
    function showToast(id, type, msg) {
        const t = document.getElementById(id);
        const icons = { error: 'fa-circle-exclamation', success: 'fa-circle-check', info: 'fa-circle-info' };
        t.className = `toast ${type}`;
        t.innerHTML = `<i class="fa-solid ${icons[type] || 'fa-circle-info'}"></i> ${msg}`;
        requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    }
    function hideToast(id) {
        const t = document.getElementById(id);
        t.className = 'toast'; t.textContent = '';
    }
    function clearAllToasts() {
        ['loginToast','signupToast','forgotToast'].forEach(hideToast);
    }

    // ── Field validation state ────────────────────────────────────────────────
    function setField(inputId, errId, valid, msg = '') {
        const input = document.getElementById(inputId);
        const err   = document.getElementById(errId);
        input.classList.toggle('error',   !valid);
        input.classList.toggle('success',  valid && input.value.length > 0);
        err.innerHTML = valid ? '' : `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
        return valid;
    }

    // ── Loading state ─────────────────────────────────────────────────────────
    function setLoading(btnId, on) {
        const btn = document.getElementById(btnId);
        btn.classList.toggle('loading', on);
        btn.disabled = on;
    }

    // ── Forgot panel toggle ───────────────────────────────────────────────────
    function toggleForgotPanel(e, forceClose = false) {
        if (e) e.preventDefault();
        const panel = document.getElementById('forgotPanel');
        if (forceClose) {
            panel.classList.remove('visible');
            hideToast('forgotToast');
        } else {
            panel.classList.toggle('visible');
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOGIN FORM
    // ─────────────────────────────────────────────────────────────────────────
    document.getElementById('loginForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        clearAllToasts();

        const email = document.getElementById('loginEmail').value.trim();
        const pw    = document.getElementById('loginPassword').value;

        let ok = true;
        if (!email || !/^\S+@\S+\.\S+$/.test(email))
            ok &= setField('loginEmail', 'loginEmailErr', false, 'Enter a valid email address.');
        else setField('loginEmail', 'loginEmailErr', true);

        if (!pw)
            ok &= setField('loginPassword', 'loginPasswordErr', false, 'Password is required.');
        else setField('loginPassword', 'loginPasswordErr', true);

        if (!ok) return;

        setLoading('loginBtn', true);

     try {
    await signInWithEmailAndPassword(auth, email, pw);

    showToast('loginToast', 'success', 'Login successful!');

    setTimeout(() => {
        window.location.href = "index.html";
    }, 1000);

} catch (error) {
    showToast('loginToast', 'error', error.message);
    setLoading('loginBtn', false);
}
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SIGNUP FORM
    // ─────────────────────────────────────────────────────────────────────────
    document.getElementById('signupForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        clearAllToasts();

        const name    = document.getElementById('signupName').value.trim();
        const email   = document.getElementById('signupEmail').value.trim();
        const pw      = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirm').value;

        let ok = true;
        if (!name || name.length < 2)
            ok &= setField('signupName', 'signupNameErr', false, 'Enter at least 2 characters.');
        else setField('signupName', 'signupNameErr', true);

        if (!email || !/^\S+@\S+\.\S+$/.test(email))
            ok &= setField('signupEmail', 'signupEmailErr', false, 'Enter a valid email address.');
        else setField('signupEmail', 'signupEmailErr', true);

        if (!pw || pw.length < 8)
            ok &= setField('signupPassword', 'signupPasswordErr', false, 'Password must be at least 8 characters.');
        else setField('signupPassword', 'signupPasswordErr', true);

        if (!confirm || confirm !== pw)
            ok &= setField('signupConfirm', 'signupConfirmErr', false, 'Passwords do not match.');
        else setField('signupConfirm', 'signupConfirmErr', true);

        if (!ok) return;

        setLoading('signupBtn', true);

try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pw);

    showToast('signupToast', 'success', 'Account created successfully! 🎉');

    setTimeout(() => {
        window.location.href = "index.html";
    }, 1200);

} catch (error) {
    showToast('signupToast', 'error', error.message);
    setLoading('signupBtn', false);
}
    });

    // ─────────────────────────────────────────────────────────────────────────
    // FORGOT PASSWORD FORM
    // ─────────────────────────────────────────────────────────────────────────
    document.getElementById('forgotForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        hideToast('forgotToast');

        const email = document.getElementById('forgotEmail').value.trim();
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            setField('forgotEmail', 'forgotEmailErr', false, 'Enter a valid email address.');
            return;
        }
        setField('forgotEmail', 'forgotEmailErr', true);

        setLoading('forgotBtn', true);

        try {
            const res  = await fetch(`${API}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            setLoading('forgotBtn', false);

            // Always show the same message (security best practice)
            showToast('forgotToast', 'success',
                'If this email is registered, a reset link has been sent. Check your inbox (and spam folder).');
            document.getElementById('forgotEmail').value = '';

        } catch (err) {
            setLoading('forgotBtn', false);
            showToast('forgotToast', 'error', 'Cannot reach server. Is the backend running?');
        }
    });

    document.getElementById("loginTab").addEventListener("click", () => switchTab("login"));

document.getElementById("signupTab").addEventListener("click", () => switchTab("signup"));

document.getElementById("forgotLink").addEventListener("click", (e) => {
    e.preventDefault();
    toggleForgotPanel(e);
});

document.getElementById("signupFooter").addEventListener("click", (e) => {
    e.preventDefault();
    switchTab("signup");
});

