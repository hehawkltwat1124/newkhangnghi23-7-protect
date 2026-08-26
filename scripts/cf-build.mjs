import { execSync } from 'child_process';

execSync('opennextjs-cloudflare build', {
    stdio: 'inherit',
    env: { ...process.env, OPENNEXT_BUILD: '1' },
});
