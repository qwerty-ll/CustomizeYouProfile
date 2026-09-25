// Pick the saved/system theme before first paint to avoid a flash. A separate
// file (not inline) so the page's Content-Security-Policy can forbid inline scripts.
try {
  const saved = JSON.parse(localStorage.getItem("cyp:theme"));
  document.documentElement.dataset.theme = saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
} catch { document.documentElement.dataset.theme = "light"; }
