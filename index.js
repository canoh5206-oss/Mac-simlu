const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Takım ve oyuncu verilerini burada tutuyoruz
const takimKadro = new Map(); 

client.on('messageCreate', async (message) => {
    // 1. MAÇ BAŞLATMA: !macbaslat [EvTakım] [DepTakım]
    if (message.content.startsWith('!macbaslat')) {
        const args = message.content.split(' ');
        const ev = args[1];
        const dep = args[2];

        if (!takimKadro.has(ev) || !takimKadro.has(dep)) return message.reply("❌ Takımların kadrosu bulunamadı!");

        let dakika = 0;
        let evGol = 0, depGol = 0;
        const msg = await message.channel.send(`🏟️ **MAÇ BAŞLIYOR!**\n${ev} vs ${dep}`);

        const macDöngüsü = setInterval(async () => {
            dakika += 10; // Maç 9 bölüme ayrıldı
            const eventType = Math.random();
            let embed = new EmbedBuilder();

            if (eventType < 0.2) { // GOL
                const atanTakim = Math.random() > 0.5 ? ev : dep;
                const oyuncular = takimKadro.get(atanTakim).oyuncular;
                const golcu = oyuncular[Math.floor(Math.random() * oyuncular.length)] || "Bilinmeyen";
                
                if (atanTakim === ev) evGol++; else depGol++;
                
                embed.setColor(0x00FF00).setTitle(`⚽ GOL! - ${dakika}'`).setDescription(`**${golcu}** GOL ATTI!`).addFields({name: 'Skor', value: `${ev} ${evGol} - ${depGol} ${dep}`});
            } else if (eventType < 0.4) { // KURTARIŞ
                embed.setColor(0x0099FF).setTitle(`🧤 KURTARIŞ - ${dakika}'`).setDescription(`Kaleci harika bir kurtarış yaptı!`);
            } else { // NORMAL OYUN
                embed.setColor(0xFFFF00).setTitle(`⏱️ ${dakika}'`).setDescription(`Orta sahada mücadele devam ediyor.`);
            }

            await message.channel.send({ embeds: [embed] });

            if (dakika >= 90) {
                clearInterval(macDöngüsü);
                message.channel.send(`🏁 **MAÇ SONUCU:** ${ev} ${evGol} - ${depGol} ${dep}`);
            }
        }, 10000); // 10 saniyede bir Embed atar
    }
});

client.login(process.env.TOKEN);
