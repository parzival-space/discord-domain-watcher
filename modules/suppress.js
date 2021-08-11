(() => {
  // ignore all console messages starting "(node:14964)" or "(Use `node -"
  let old = console.log;
  console.log = (...args) => {
    if (args[0].indexOf("(node:14964)") === -1 && args[0].indexOf("(Use `node -") === -1) {
      old.apply(console, args);
    }
  }
})();
