/*
Remix of this setup https://github.com/wuruoyun/electron-vue-spring
*/
const electron = require('electron');
const path = require('path');
const axios = require('axios');
const logger = require('./logger');
var findPort = require("find-free-port");


const { app, BrowserWindow, dialog } = electron;
const JAR = "bridges-service-*.jar";
const MAX_CHECK_COUNT = 10;

let win;
let serverProcess;
let baseUrl;

function createWindow () {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  });
}

function startServer(port) {
  logger.info(`Starting server ...`);
  const server = `${path.join(app.getAppPath(), 'target', '**', JAR)}`;
  
  logger.info(`Launching server with jar ${server} ...`);
  serverProcess = require('child_process')
        .spawn('java', [`-Dservice.overridePort=${port}`, '-jar', server], {shell: true});

  serverProcess.stdout.on('data', logger.server);

  if (serverProcess.pid) {
    baseUrl = `http://localhost:${port}`;
    process.env.PROJECT_BASE_URL = baseUrl;
    logger.info("Server PID: " + serverProcess.pid);
    checkCount = 0
    setTimeout(function cycle() {
      axios.get(`${baseUrl}`,
      //TODO Implement healthcheck. Accept 400s as a workaround
      {validateStatus: function (status) { return status >= 200 && status < 500;}})
      .then(() => {
        logger.info("Server is up.");
        win.loadURL(`${baseUrl}/assets/index.html`);
        //Devtools helpful for debugging. TODO: remove in prod.
        win.webContents.openDevTools();})
      .catch(e => {
        if (e.code === 'ECONNREFUSED') {
          if (checkCount < MAX_CHECK_COUNT) {
            checkCount++;
            setTimeout(cycle, 1000);
          } else {
            quitOnError('Server timeout',
              `UI does not receive server response for ${MAX_CHECK_COUNT} seconds.`)
            app.quit()
          }
        } else {
          logger.error(e)
          quitOnError('Server error', 'UI receives an error from server.')
        }
      });
  }, 200);
  } else {
    logger.error("Failed to launch server process.")
  }
}

function stopServer() {
  logger.info('Stopping server...')
  axios.post(`${baseUrl}/shutdown`, null, {
    headers: {'Content-Type': 'application/json'}
  })
    .then(() => (logger.info('Server stopped')))
    .catch(error => {
      logger.error('Failed to stop the server gracefully.', error)
      if (serverProcess) {
        logger.info(`Killing server process ${serverProcess.pid}`);
        const kill = require('tree-kill');
        kill(serverProcess.pid, 'SIGTERM', function (err) {
          logger.info('Server process killed');
          serverProcess = null;
          baseUrl = null;
          app.quit();
        });
      }
    })
    .finally(() => {
      serverProcess = null;
      baseUrl = null;
      app.quit();
    })
}

function quitOnError(title, content) {
  logger.error(content)
  dialog.showErrorBox(title, content)
  app.quit()
}

app.whenReady().then(function() {
  createWindow();
  // Get port in the dynamic port range for now; RFC6335
  findPort(49152, function(error, freePort) {
    if (!error) {
      startServer(freePort);
    } else {
      quitOnError("Server Error", "Failed to find free port.")
    }
  });
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    if (!serverProcess) {
      findPort(49152, function(error, freePort) {
        if (!error) {
          startServer(freePort);
        } else {
          quitOnError("Server Error", "Failed to find free port.")
        }
      });
    } else {
      win.loadURL(`${baseUrl}/assets/index.html`);
    }
  }
})

app.on("will-quit", e => {
  if (baseUrl != null) {
    stopServer();
    e.preventDefault();
  }
})
