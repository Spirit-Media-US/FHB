import 'dotenv/config';
import SftpClient from 'ssh2-sftp-client';

const { SFTP_HOST, SFTP_USER, SFTP_PASSWORD, SFTP_REMOTE_PATH } = process.env;

if (!SFTP_HOST || !SFTP_USER || !SFTP_PASSWORD || !SFTP_REMOTE_PATH) {
	console.error('❌ Missing SFTP environment variables. Check your .env file.');
	process.exit(1);
}

const sftp = new SftpClient();

async function deploy() {
	try {
		console.log(`🔗 Connecting to ${SFTP_HOST}...`);
		await sftp.connect({
			host: SFTP_HOST,
			username: SFTP_USER,
			password: SFTP_PASSWORD,
			port: 22,
		});

		console.log(`📤 Uploading ./dist to ${SFTP_REMOTE_PATH}...`);
		await sftp.uploadDir('./dist', SFTP_REMOTE_PATH as string);

		console.log('✅ Deployment complete!');
	} catch (error) {
		console.error('❌ Deployment failed:', error);
		process.exit(1);
	} finally {
		await sftp.end();
	}
}

deploy();
