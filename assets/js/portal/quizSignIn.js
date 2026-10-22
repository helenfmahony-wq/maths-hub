/**
 * QUIZ SIGN-IN — drop-in student login for any quiz page.
 *
 * Add ONE line as the last thing before </body>:
 *
 *   <script src="../shared/quizSignIn.js"></script>
 *
 * (adjust the ../ to reach the shared folder from where the quiz lives).
 *
 * It shows a "Student code" box when the page opens, with a Skip button so a
 * quiz still works for a guest. When the student finishes, the quiz calls:
 *
 *   PlatformSave({ toolId: "times-tables", score: 8, total: 10, topic: "Multiplication" });
 *
 * If they signed in, the result goes to their dashboard and their teacher's.
 * If they skipped, nothing is saved and a small note says so.
 *
 * Optional: put <span id="signInSlot"></span> where you want the
 * "Signed in as …" chip; otherwise it sits in the top-right corner.
 */
(function () {
  "use strict";
  var here = document.currentScript && document.currentScript.src;
  var clientUrl = here ? new URL("quizClient.js", here).href : "../shared/quizClient.js";

  var css =
    ".ps-back{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(28,25,23,.45);font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}" +
    ".ps-card{background:#fff;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.18);max-width:420px;width:100%;padding:24px;color:#1c1917}" +
    ".ps-card h2{margin:0 0 6px;font-size:1.25rem}" +
    ".ps-card p{margin:0 0 16px;color:#6b6763;font-size:.92rem;line-height:1.5}" +
    ".ps-card label{display:block;font-size:.8rem;font-weight:600;color:#57534e;margin-bottom:6px}" +
    ".ps-card input{width:100%;box-sizing:border-box;height:48px;border:1px solid #d6d3d1;border-radius:10px;padding:0 14px;font-size:1.15rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;outline:none}" +
    ".ps-card input:focus{border-color:#57534e;box-shadow:0 0 0 3px rgba(87,83,78,.15)}" +
    ".ps-row{display:flex;gap:10px;margin-top:14px}" +
    ".ps-btn{flex:1;border:1px solid #d6d3d1;border-radius:10px;padding:12px;font:inherit;font-weight:600;cursor:pointer;background:#fff;color:#1c1917}" +
    ".ps-btn.go{background:#0f766e;border-color:#0f766e;color:#fff}" +
    ".ps-btn.go:hover{background:#0b5a54}" +
    ".ps-msg{min-height:18px;margin-top:10px;font-size:.88rem;font-weight:600}" +
    ".ps-chip{display:inline-flex;align-items:center;gap:8px;font:600 13px system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}" +
    ".ps-chip.float{position:fixed;top:10px;right:10px;z-index:40}" +
    ".ps-pill{border:1px solid #e7e5e4;background:#fafaf9;color:#57534e;border-radius:999px;padding:6px 12px}" +
    ".ps-pill.on{background:#ecfdf3;border-color:#bbe5c8;color:#25633a}" +
    ".ps-chip button{border:1px solid #0f766e;background:#0f766e;color:#fff;border-radius:999px;padding:6px 12px;font:inherit;cursor:pointer}" +
    ".ps-toast{display:none;position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483001;background:#0f766e;color:#fff;font:600 14px system-ui,sans-serif;padding:10px 18px;border-radius:999px}";

  var html =
    '<div class="ps-back" id="psBack" role="dialog" aria-modal="true" aria-labelledby="psTitle">' +
    '<div class="ps-card">' +
    '<h2 id="psTitle">Student sign in</h2>' +
    "<p>Type your student code so your result is saved for your teacher. No code? Press <b>Skip</b> — you can still do the quiz.</p>" +
    '<label for="psCode">Student code</label>' +
    '<input id="psCode" autocomplete="off" spellcheck="false">' +
    '<div id="psPinWrap" style="display:none;margin-top:12px"><label for="psPin">PIN</label><input id="psPin" autocomplete="off" inputmode="numeric"></div>' +
    '<div class="ps-row"><button class="ps-btn go" id="psGo" type="button">Start</button><button class="ps-btn" id="psSkip" type="button">Skip</button></div>' +
    '<div class="ps-msg" id="psMsg"></div>' +
    "</div></div>" +
    '<div class="ps-toast" id="psToast"></div>';

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  var holder = document.createElement("div");
  holder.innerHTML = html;
  while (holder.firstChild) document.body.appendChild(holder.firstChild);

  var $ = function (id) { return document.getElementById(id); };
  var client = null, loading = null, mode = "pending", student = null;

  // One shared promise, so a click that lands while the client is still
  // downloading waits for it instead of seeing "not available".
  function load() {
    if (loading) return loading;
    return loading = import(clientUrl)
      .then(function (m) { client = m; m.init(); return client; })
      .catch(function (e) { console.warn("Quiz sign-in unavailable — guest mode only.", e); client = null; return null; });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function say(t, colour) { $("psMsg").style.color = colour || "#6b6763"; $("psMsg").textContent = t; }
  function toast(t) { var el = $("psToast"); el.textContent = t; el.style.display = "block"; clearTimeout(toast._t); toast._t = setTimeout(function () { el.style.display = "none"; }, 3500); }
  function close() { $("psBack").style.display = "none"; }
  function open() { say(""); $("psBack").style.display = "flex"; setTimeout(function () { $("psCode").focus(); }, 50); }
  function name() { return student ? (student.name || student.studentCode) : ""; }

  var chip = null;
  function paintChip() {
    if (!chip) {
      var slot = $("signInSlot");
      chip = document.createElement("span");
      chip.className = "ps-chip" + (slot ? "" : " float");
      (slot || document.body).appendChild(chip);
    }
    if (mode === "pending") { chip.innerHTML = ""; return; }
    if (mode === "signed-in") { chip.innerHTML = '<span class="ps-pill on">● Signed in as ' + esc(name()) + "</span>"; return; }
    chip.innerHTML = '<span class="ps-pill">○ Guest</span><button type="button" id="psChipBtn">Sign in</button>';
    $("psChipBtn").addEventListener("click", open);
  }

  function go() {
    var code = String($("psCode").value || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    $("psCode").value = code;
    if (!code) { say("Type your code, or press Skip.", "#b42318"); return; }
    say("Checking…");
    load().then(function (c) {
      if (!c) { say("Sign-in isn't available here — press Skip to carry on.", "#b42318"); return; }
      return c.signIn(code, $("psPin").value).then(function (r) {
        if (r && r.ok) {
          mode = "signed-in"; student = r.profile; paintChip();
          say("Signed in as " + name(), "#25633a");
          setTimeout(close, 450);
        } else {
          if (r && r.needsPin) $("psPinWrap").style.display = "block";
          say((r && r.error) || "Could not sign in.", "#b42318");
        }
      });
    });
  }

  $("psGo").addEventListener("click", go);
  $("psSkip").addEventListener("click", function () { mode = "guest"; student = null; paintChip(); close(); });
  [$("psCode"), $("psPin")].forEach(function (el) {
    el.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); go(); } });
  });
  setTimeout(function () { try { $("psCode").focus(); } catch (e) {} }, 60);

  // Demo mode (see demo.js): say which code to use.
  try {
    if (/[?&]demo(=|&|$)/.test(location.search) && !/demo=off/.test(location.search)) sessionStorage.setItem("tp-demo-mode", "1");
    if (sessionStorage.getItem("tp-demo-mode") === "1") {
      $("psCode").insertAdjacentHTML("afterend", '<div style="font-size:.82rem;color:#2c3a4b;background:#e9eef5;border-radius:8px;padding:6px 10px;margin-top:8px">Demo mode — try student code <b>AVA234</b></div>');
    }
  } catch (e) { /* ignore */ }

  /** Call when the student finishes. Returns a promise of { saved: true|false }. */
  window.PlatformSave = function (payload) {
    if (mode !== "signed-in") { toast("Not saved — you're in guest mode"); return Promise.resolve({ saved: false }); }
    toast("Saving…");
    return load()
      .then(function (c) { return c.saveResult(payload || {}); })
      .then(function (r) { toast(r && r.saved ? "Saved ✓ — your teacher can see this" : "Not saved"); return r; })
      .catch(function (e) { console.error(e); toast("Couldn't save — tell your teacher your score"); return { saved: false, error: true }; });
  };
  window.PlatformAuth = {
    mode: function () { return mode; },
    student: function () { return student; },
    signIn: open,
  };

  paintChip();
  load(); // warm up so the Start button is quick

  // Opened from the student dashboard? It passes ?code=… — sign straight in,
  // then take the code back out of the address bar.
  try {
    var params = new URLSearchParams(location.search);
    var preset = params.get("code");
    if (preset) {
      $("psCode").value = preset;
      params.delete("code");
      var rest = params.toString();
      history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
      go();
    }
  } catch (e) { /* ignore */ }
})();
