const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// Botun mesaj atabilmesi ve içerikleri okuyabilmesi için gerekli Intent'ler
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Bot aktif olduğunda Railway konsoluna yazdırılacak kısım
client.once('ready', () => {
    console.log(`🏟️ Maç Simülatör Botu Railway üzerinde aktif: ${client.user.tag}`);
});

// Komut Dinleyici Sistemi
client.on('messageCreate', async (message) => {
    // Botların kendi mesajlarına yanıt vermesini engeller ve sadece "." ile başlayanları dinler
    if (message.author.bot || !message.content.startsWith('.')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ==========================================
    // YAŞASIN FUTBOL: .mac-baslat KOMUTU
    // ==========================================
    if (command === 'mac-baslat' || command === 'maç-başlat') {
        const macMetni = args.join(' ');
        if (!macMetni || !macMetni.includes('vs')) {
            return message.reply('❌ **Hata:** Lütfen takımları doğru yaz kanka! \n*Örnek:* `.mac-baslat Anadolu FK vs Shadow Wolves`');
        }

        const takimlar = macMetni.split('vs');
        const takimA = takimlar[0].trim();
        const takimB = takimlar[1].trim();

        let skorA = 0;
        let skorB = 0;
        let mevcutDakika = 0;

        // Maç başladı mesajı
        const baslangicEmbed = new EmbedBuilder()
            .setTitle('🏟️ Maç Başladı!')
            .setDescription(`**${takimA}** ${skorA} - ${skorB} **${takimB}**\n\n🟢 Hakem düdüğü çaldı ve zorlu mücadele başladı!`)
            .setColor(0x2ECC71)
            .setFooter({ text: 'Maç Süresi: 25 Dakika (Toplam 2500 Saniye)' });

        const canlıMesaj = await message.channel.send({ embeds: [baslangicEmbed] });

        // Maç içi yapay zeka spiker yorumları
        const olaylar = [
            "Tehlikeli bir atak! Kaleci son anda topu kornere çeliyor.",
            "Orta sahada kıran kırana bir mücadele var.",
            "Sert bir müdahale! Hakem oyuncuyu sözlü olarak uyarıyor.",
            "Ceza sahası dışından sert bir şut! Top az farkla dışarıda.",
            "Savunmanın büyük hatası! Ancak forvet oyuncusu topu ıskalıyor.",
            "Müthiş bir ara pası! Savunma son anda araya giriyor.",
            "Hakem serbest vuruş kararı veriyor.",
            "Oyunda tempo bu dakikalarda biraz düştü."
        ];

        // 25 dakikalık döngü (Her 1 oyun dakikası = 100 saniye = 100000 milisaniye)
        const macDongusu = setInterval(async () => {
            mevcutDakika++;

            let durumMesaji = "";
            const sans = Math.random();

            if (sans < 0.12) { // %12 ihtimalle Takım A gol atar
                skorA++;
                durumMesaji = `⚽ **GOL!** ${takimA} oyuncuları müthiş bir organizasyonla topu ağlara gönderdi!`;
            } else if (sans < 0.24) { // %12 ihtimalle Takım B gol atar
                skorB++;
                durumMesaji = `⚽ **GOL!** ${takimB} hızlı hücumla aradığı golü buluyor!`;
            } else if (sans < 0.32) { // %8 ihtimalle Sarı Kart
                durumMesaji = "🟨 **Sarı Kart!** Hakem sert müdahale sonrası kartını çıkardı.";
            } else { // Normal pozisyon
                durumMesaji = olaylar[Math.floor(Math.random() * olaylar.length)];
            }

            // Maçın bitiş kontrolü (25. dakika)
            if (mevcutDakika >= 25) {
                clearInterval(macDongusu); // Zamanlayıcıyı kapat

                let bitisAciklamasi = `🏁 **Maç Bitti!** \n\n Müthiş mücadele sona erdi. `;
                if (skorA > skorB) bitisAciklamasi += `🎉 Kazanan: **${takimA}**`;
                else if (skorB > skorA) bitisAciklamasi += `🎉 Kazanan: **${takimB}**`;
                else bitisAciklamasi += `🤝 Dostluk kazandı, maç berabere bitti!`;

                const bitisEmbed = new EmbedBuilder()
                    .setTitle('🏁 Maç Sonucu')
                    .setDescription(`**${takimA}** ${skorA} - ${skorB} **${takimB}**\n\n${bitisAciklamasi}`)
                    .setColor(0xE74C3C)
                    .setFooter({ text: `⏱️ Maç sona erdi (2500 saniye sürdü)` });

                await canlıMesaj.edit({ embeds: [bitisEmbed] }).catch(err => console.error(err));
                return;
            }

            // Her 100 saniyede bir paneli güncelleme
            const guncelEmbed = new EmbedBuilder()
                .setTitle('🏟️ Canlı Skor')
                .setDescription(`**${takimA}** ${skorA} - ${skorB} **${takimB}**\n\n⏱️ **Dakika:** \`${mevcutDakika}'\`\n\n🎙️ ${durumMesaji}`)
                .setColor(0x3498DB)
                .setFooter({ text: `Maç devam ediyor...` });

            await canlıMesaj.edit({ embeds: [guncelEmbed] }).catch(err => console.error("Mesaj güncellenemedi:", err));

        }, 100000); // 100 saniyede bir tetiklenir
    }
});

// Railway'deki TOKEN değişkeniyle giriş yapar
client.login(process.env.TOKEN);
                    
