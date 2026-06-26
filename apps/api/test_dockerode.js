const Docker = require('dockerode');
const docker = new Docker();

async function run() {
  const container = await docker.createContainer({
    Image: 'node:22-bookworm-slim',
    Tty: true,
    Cmd: ['/bin/bash'],
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    OpenStdin: true,
    StdinOnce: false,
  });

  const stream = await container.attach({
    stream: true,
    stdin: true,
    stdout: true,
    stderr: true,
    hijack: true // <-- this is often needed
  });

  stream.on('data', d => process.stdout.write(d));
  
  await container.start();

  stream.write('ls\n');
  
  setTimeout(async () => {
    await container.stop();
    await container.remove();
    console.log('\nDone');
  }, 2000);
}
run().catch(console.error);
