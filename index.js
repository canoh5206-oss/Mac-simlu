const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const KANAL_ID = '1519410661237461044'; // Kanal ID'n

client.on('messageCreate', async (message) => {
    if (message.content === '!macbaslat') {
        let evSahibi = "Anadolu FK";
        let deplasman = "Shadow Wolves FC";
        let evG = 0, depG = 0;

        const msg = await message.channel.send(`🏟️ **Reality League Başlıyor!**\n${evSahibi} vs ${deplasman}`);

        let dakika = 0;
        const mac = setInterval(async () => {
            dakika += 30;
            if (dakika <= 90) {
                if (Math.random() > 0.5) { evG++; } else { depG++; }
                await msg.edit(`⚽ **Dakika ${dakika}:** Maç devam ediyor...\nSkor: **${evSahibi} ${evG} - ${depG} ${deplasman}**`);
            } else {
                clearInterval(mac);
                await msg.edit(`🏁 **Maç Bitti!**\n**Sonuç:** ${evSahibi} ${evG} - ${depG} ${deplasman}`);
            }
        }, 5000); // 5 saniyede bir dakika ilerler
    }
});

client.login(process.env.TOKEN); // Token'ı Railway'de ekleyeceğiz
