// use the link to find the chat_id and message_thread_id
// https://api.telegram.org/bot${process.env.TURINGM_TG_BUILD_BOT_TOKEN}/getUpdates
import axios from 'axios';
// import dotenv from 'dotenv';
// dotenv.config({ path: '.env.local' });

async function sendBuildNotification(message) {
    try {
        const url = `https://api.telegram.org/bot${process.env.TURINGM_TG_BUILD_BOT_TOKEN}/sendMessage`
        const data = {
            chat_id: process.env.TURINGM_TG_BUILD_CHAT_ID,
            message_thread_id: process.env.TURINGM_TG_BUILD_MESSAGE_THREAD_ID,
            text: `${message}
            • Domain: ${process.env.VERCEL_URL}
            • Repo: https://github.com/${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}/tree/${process.env.VERCEL_GIT_COMMIT_REF}
            • Branch: ${process.env.VERCEL_GIT_COMMIT_REF}
            • PR: https://github.com/${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}/pull/${process.env.VERCEL_GIT_PULL_REQUEST_ID}
            • Author: ${process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME}`,
            parse_mode: 'HTML'
        }
        const response = await axios.post(
            url,
            data
        );
        console.log('Telegram notification sent:', response.data);
    } catch (error) {
        console.error('send notification failed:', error.response.data);
    }
}

// Get the first command-line argument
const [,, firstArg] = process.argv;
const statusMessage = firstArg || 'Build status unknown';
console.log('xxxxx', statusMessage)
sendBuildNotification(statusMessage);
