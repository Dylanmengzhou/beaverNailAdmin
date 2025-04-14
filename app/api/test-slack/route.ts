export async function GET() {
	const webhookUrl =
		"https://hooks.slack.com/services/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";

	const username = "布布";
	const email = "010-1234-5678";
	const date = "2023-10-28";
	const timeSlot = "10:00 - 11:00";
	await fetch(webhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			text: `✅ *你有新的预约*\n👤 顾客名:${username}\n🗓 预约日期: ${date}\n⌛️ 预约时间: ${timeSlot}`,
		}),
	});

	await fetch(
		"https://botbuilder.larksuite.com/api/trigger-webhook/5b8929c8824bd9320346d9d8b87544ab",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				msg_type: "text",
				content: {
					username: username,
					phone: email,
					date: date,
					time: timeSlot,
				},
			}),
		}
	);

	return new Response(
		JSON.stringify({ message: "Slack提醒发送了！" }),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		}
	);
}
