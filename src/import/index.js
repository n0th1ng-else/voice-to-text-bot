/* eslint-env browser */

const onAction = () => {
  fetch("/status")
    .then((response) => response.json())
    .then((data) => {
      const status = data.idle ? "Idling" : "Running";
      const percentage = data.total ? (100 * data.done) / data.total : 0;
      const text = `${status} ${percentage.toFixed(2)} (${data.done} of ${
        data.total
      })`;
      const el = document.getElementById("statusEl");
      el.textContent = text;

      if (!data.idle || data.done !== data.total) {
        setTimeout(() => onAction(), 500);
      }
    });
};

const onFileSelect = () => {
  const el = document.getElementById("fileEl");
  el.setAttribute("disabled", "disabled");

  fetch("/import", {
    method: "POST",
    body: el.files[0],
  })
    .then(() => onAction())
    .finally(() => el.removeAttribute("disabled"));
};

// Attaching event handlers
document
  .querySelector("#fileEl")
  .addEventListener("onchange", () => onFileSelect());