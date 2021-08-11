(() => {
  // ignore all console messages starting "(node:14964)" or "(Use `node -"
  let old = console.log;
  console.log = (...args) => {
    if (args[0].startsWith("(node:14964)") === false && args[0].startsWith("(Use `node -") === false) {
      old.apply(console, args);
    }
  }
})();
