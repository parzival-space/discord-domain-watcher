const { find: isAvailable } = require('check-domain-availability').Domains;
const { get } = require('axios').default;
const { Agent } = require('https');

const status = {
  AVAILABLE: 0,
  REACHABLE: 1,
  UNREACHABLE: 2,
  ERROR: 3
};

function isReachable(url, xtimeout = 3000) {
  const agent = new Agent({  
    rejectUnauthorized: false
  });

  return new Promise(async (resolve) => {
    get(url, { httpsAgent: agent, timeout: xtimeout })
      .then((response) => resolve(response.data !== undefined ? status.REACHABLE : status.UNREACHABLE))
      .catch(function (error) {
        if (error?.response?.status !== undefined) return resolve(status.ERROR);
        resolve(status.UNREACHABLE);
      });
  });
}

module.exports = {

  checkDomain: (domain = "example.com") => {
    return new Promise(async (resolve) => {
      // check if domain is available
      let available = await isAvailable(domain);
      if (available) return resolve(status.AVAILABLE);
    
      // check if website is reachable
      return resolve(await isReachable(`http://${domain}`));
    });
  },

  status: status,

  getChar: (code, pattern) => {
    switch (code) {
      case status.REACHABLE:
        return pattern.reachable;

      case status.UNREACHABLE:
        return pattern.unreachable;

      case status.ERROR:
        return pattern.websiteError;

      case status.AVAILABLE:
        return pattern.unclaimed;
    
      default:
        return "";
    }
  }

}