const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('messageCreate', async (message) => {
    if (message.content === '!macbaslat') {
        let dakika = 0;
        let evGol = 0, depGol = 0;
        
        // Aksiyon dolu olay listesi
        const olaylar = [
            "Kaleci topu oyuna soktu.", "Mükemmel bir pas trafiği!", "Rakibini dribbling ile geçti!", 
            "Orta sahada kıran kırana bir mücadele!", "Araya çok kritik bir pas!", 
            "Kaleci inanılmaz bir kurtarış yaptı!", "Topu ayağından kaçırdı, top kaybı!", 
            "Sahada gerginlik! Futbolcular arasında kavga çıktı!", "Sert bir müdahale geldi.",
            "Kanattan hızlı bir bindirme!", "Savunma hata yapmadı, top kornere çıktı."
        ];
        
        const mesaj = await message.channel.send("🏟️ **Reality League Başlıyor!**\nMaç hakemin düdüğü ile başlıyor!");

        // 10 saniyede 1 dakika ilerleyecek şekilde zamanlayıcı
        const macDöngüsü = setInterval(async () => {
            dakika++;
            
            // Rastgele olay seç
            let olay = olaylar[Math.floor(Math.random() * olaylar.length)];
            
            // %10 gol şansı
            if (Math.random() < 0.10) {
                if (Math.random() > 0.5) evGol++; else depGol++;
                olay = "⚽ **GOL! TOP AĞLARDA! HARİKA BİR VURUŞ!**";
            }

            // Mesajı güncelle
            await mesaj.edit(`🏟️ **Reality League - Dakika ${dakika}'**
---------------------------
⚽ **Skor:** ${evGol} - ${depGol}
📝 **Durum:** ${olay}
---------------------------`);

            if (dakika >= 90) {
                clearInterval(macDöngüsü);
                await mesaj.edit(`🏁 **MAÇ BİTTİ!**

🏆 **Sonuç:** ${evGol} - ${depGol}

*Reality League'de nefes kesen bir 90 dakika geride kaldı!*`);
            }
        }, 10000); // 10 saniye = 1 dakika
    }
});

client.login(process.env.TOKEN);
