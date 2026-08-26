import { execSync } from 'child_process';

execSync('next build', { stdio: 'inherit' });

const packageForCloudflare =
    process.env.CI === 'true' &&
    process.env.OPENNEXT_BUILD !== '1' &&
    !process.env.NETLIFY;

if (packageForCloudflare) {
    execSync('opennextjs-cloudflare build', {
        stdio: 'inherit',
        env: { ...process.env, OPENNEXT_BUILD: '1' },
    });
}
