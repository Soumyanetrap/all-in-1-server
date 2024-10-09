if (typeof exec === 'undefined') {
    const { exec } = require('child_process');
    const os = require('os');
    // console.log()
    function killPortProcess(port) {
        return new Promise((resolve, reject) => {
            // Determine the OS
            const platform = os.platform();
            let command;

            if (platform === 'win32') {
                // Windows commands
                command = `netstat -aon | findstr :${port}`;
            } else if (platform === 'darwin' || platform === 'linux') {
                // macOS and Linux commands
                command = `lsof -i :${port}`;
            } else {
                return reject(new Error('Unsupported OS'));
            }

            exec(command, (err, stdout) => {
                if (err) {
                    return reject(err);
                }

                let pids = [];
                if (platform === 'win32') {
                    // Parse output for Windows
                    const lines = stdout.trim().split('\n');
                    pids = lines.map(line => line.split(/\s+/).pop()).filter(pid => !isNaN(pid));
                } else {
                    // Parse output for macOS/Linux
                    const lines = stdout.trim().split('\n');
                    pids = lines.slice(1).map(line => {
                        const columns = line.split(/\s+/);
                        return columns[columns.length - 1];
                    }).filter(pid => !isNaN(pid));
                }

                let filtered_pids = pids.filter(item => (item !== '0' && item !== ''));
                // console.log(filtered_pids);

                if (filtered_pids.length > 0) {
                    const killCommand = platform === 'win32'
                        ? `taskkill /PID ${filtered_pids.join(' ')} /F`
                        : `kill -9 ${filtered_pids.join(' ')}`;

                    exec(killCommand, (err) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    module.exports = killPortProcess;
}