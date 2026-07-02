const { Client, GatewayIntentBits, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = ".";

client.once('ready', () => {
    console.log(`[BOT] ${client.user.tag} başarıyla aktif edildi!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    // Sadece sunucu sahibinin bu kritik komutları kullanabilmesi için güvenlik kontrolü
    if (message.author.id !== message.guild.ownerId) {
        return message.reply("❌ Bu yönetim komutlarını sadece **Sunucu Sahibi** kullanabilir!");
    }

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ==========================================
    // 1. .temizle KOMUTU
    // ==========================================
    if (command === 'temizle') {
        try {
            const bildiri = await message.reply("🧹 **Karagore Temizlik Sistemi Başlatıldı!** Tüm kanallar, ses odaları ve roller siliniyor, lütfen bekleyin...");

            // Tüm kanalları sil (Botun silebileceklerini)
            const channels = await message.guild.channels.fetch();
            for (const [id, channel] of channels) {
                if (channel) await channel.delete().catch(() => null);
            }

            // Tüm rolleri sil (Entegrasyon rolleri ve @everyone hariç)
            const roles = await message.guild.roles.fetch();
            for (const [id, role] of roles) {
                if (!role.managed && role.id !== message.guild.id) {
                    await role.delete().catch(() => null);
                }
            }

            // Temizlik bittikten sonra bota komut gönderebileceğimiz tek bir kanal açalım
            const yeniKanal = await message.guild.channels.create({
                name: 'kurulum-odası',
                type: ChannelType.GuildText
            });

            const basariliEmbed = new EmbedBuilder()
                .setColor('#2F3136')
                .setTitle('🧼 Temizlik Tamamlandı')
                .setDescription('Sunucudaki kanallar, sesli odalar ve roller başarıyla temizlendi!\nŞimdi kuruma başlamak için `.sunucukur` yazabilirsiniz.')
                .setTimestamp();

            return yeniKanal.send({ embeds: [basariliEmbed] });

        } catch (error) {
            console.error(error);
            return message.reply("❌ Temizlik sırasında bir hata meydana geldi.");
        }
    }

    // ==========================================
    // 2. .sunucukur KOMUTU
    // ==========================================
    if (command === 'sunucukur') {
        // İstediğin kategori ve kanal listesi şeması
        const sunucuYapisi = [
            {
                kategori: "1. Efsane League (karagore)",
                kanallar: [{ name: "🎪・takımlar", type: ChannelType.GuildText }, { name: "・kayıt-odasi", type: ChannelType.GuildText }]
            },
            {
                kategori: "2. Bilgilendirme (karagore)",
                kanallar: [
                    { name: "📣・duyuru", type: ChannelType.GuildText }, { name: "📦・sistemler", type: ChannelType.GuildText },
                    { name: "📚・kurallar", type: ChannelType.GuildText }, { name: "💎・anılar", type: ChannelType.GuildText },
                    { name: "🎭・rol-bilgi", type: ChannelType.GuildText }, { name: "🔮・rol-alma", type: ChannelType.GuildText },
                    { name: "🚀・booster", type: ChannelType.GuildText }, { name: "📈・seviye", type: ChannelType.GuildText },
                    { name: "✨・yetkili-alım", type: ChannelType.GuildText }, { name: "✨・spiker-alım", type: ChannelType.GuildText },
                    { name: "🎙️・spiker-sonuçları", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "3. Diğer Kanallar (karagore)",
                kanallar: [
                    { name: "🔔・güncelleme", type: ChannelType.GuildText }, { name: "🚀・booster-bilgi", type: ChannelType.GuildText },
                    { name: "🛒・market", type: ChannelType.GuildText }, { name: "🗳️・oy-ver", type: ChannelType.GuildText },
                    { name: "🎉・event", type: ChannelType.GuildText }, { name: "🎊・çekiliş", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "4. Genel",
                kanallar: [{ name: "・sohbet", type: ChannelType.GuildText }, { name: "・medya", type: ChannelType.GuildText }, { name: "🤖・bot-komut", type: ChannelType.GuildText }, { name: "💡・istek-şikayet", type: ChannelType.GuildText }]
            },
            {
                kategori: "5. Eğlence Kanalları (karagore)",
                kanallar: [{ name: "💵・owo", type: ChannelType.GuildText }, { name: "🏆・turnuva", type: ChannelType.GuildText }, { name: "💫・bil-kazan", type: ChannelType.GuildText }]
            },
            {
                kategori: "6. Antrenman (karagore)",
                kanallar: [{ name: "🎽・antrenman", type: ChannelType.GuildText }, { name: "🥅・penaltı-antrenman", type: ChannelType.GuildText }, { name: "🎽・antrenman-bilgi", type: ChannelType.GuildText }]
            },
            {
                kategori: "7. Değer İsteme & Bütçe İsteme (karagore)",
                kanallar: [{ name: "📊・değer-bütçe-kasma", type: ChannelType.GuildText }, { name: "💸・değer-bütçe-isteme", type: ChannelType.GuildText }, { name: "🔍・değer-bütçe-bildiri", type: ChannelType.GuildText }]
            },
            {
                kategori: "8. Sosyal Medya (karagore)",
                kanallar: [{ name: "🌐・twitter", type: ChannelType.GuildText }, { name: "📷・instagram", type: ChannelType.GuildText }, { name: "🎵・tiktok", type: ChannelType.GuildText }, { name: "📰・reality-haber", type: ChannelType.GuildText }]
            },
            {
                kategori: "9. efsane (karagore)",
                kanallar: [{ name: "💰・en-değerli-futbolcular", type: ChannelType.GuildText }, { name: "💰・en-değerli-takımlar", type: ChannelType.GuildText }, { name: "🏛️・müze", type: ChannelType.GuildText }, { name: "⭐・efsaneler", type: ChannelType.GuildText }]
            },
            {
                kategori: "10. Efsane Lig (karagore)",
                kanallar: [
                    { name: "🏆・puan-durumu", type: ChannelType.GuildText }, { name: "📅・fikstür", type: ChannelType.GuildText },
                    { name: "📝・maç-sonuçları", type: ChannelType.GuildText }, { name: "⚽・gol-krallığı", type: ChannelType.GuildText },
                    { name: "⚽・asist-krallığı", type: ChannelType.GuildText }, { name: "🏥・sakatlıklar", type: ChannelType.GuildText },
                    { name: "🟥・cezalılar", type: ChannelType.GuildText }, { name: "🥅・kadrolar", type: ChannelType.GuildText },
                    { name: "👑・sezonun-oyuncusu", type: ChannelType.GuildText }, { name: "👑・haftanın-oyuncusu", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "11. Efsane Cup (karagore)",
                kanallar: [
                    { name: "📅・fikstür", type: ChannelType.GuildText }, { name: "📝・maç-sonuçları", type: ChannelType.GuildText },
                    { name: "⚽・gol-krallığı", type: ChannelType.GuildText }, { name: "⚽・asist-krallığı", type: ChannelType.GuildText },
                    { name: "🟥・cezalılar", type: ChannelType.GuildText }, { name: "🥅・kadrolar-cup", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "12. Efsane Süper Cup (karagore)",
                kanallar: [{ name: "📅・fikstür", type: ChannelType.GuildText }, { name: "🔍・maç-sonuçları", type: ChannelType.GuildText }, { name: "👑・krallıklar", type: ChannelType.GuildText }]
            },
            {
                kategori: "13. Maç Kanalları (karagore)",
                kanallar: [
                    { name: "📺・bein-sports", type: ChannelType.GuildText }, { name: "🏟️・bein-tribün", type: ChannelType.GuildVoice },
                    { name: "📺・exxen-spor", type: ChannelType.GuildText }, { name: "🏟️・exxen-tribün", type: ChannelType.GuildVoice },
                    { name: "📺・aspor", type: ChannelType.GuildText }, { name: "🏟️・aspor-tribün", type: ChannelType.GuildVoice }
                ]
            },
            {
                kategori: "14. Transfer (karagore)",
                kanallar: [{ name: "🚧・transfer-kuralları", type: ChannelType.GuildText }, { name: "✅・kap", type: ChannelType.GuildText }, { name: "🔍・takım-arama", type: ChannelType.GuildText }, { name: "💷・transfer-masası", type: ChannelType.GuildText }, { name: "📋・kap-bilgi", type: ChannelType.GuildText }]
            },
            {
                kategori: "15. Ticketlar (karagore)",
                kanallar: [{ name: "🎫・ticket", type: ChannelType.GuildText }]
            }
        ];

        try {
            await message.reply("🏗️ **Lig kanalları oluşturulmaya başlandı.** Bu işlem biraz sürebilir, kategoriler sırayla inşa ediliyor...");

            for (const veri of sunucuYapisi) {
                // Önce Kategoriyi oluşturuyoruz
                const kategoriKanal = await message.guild.channels.create({
                    name: veri.kategori,
                    type: ChannelType.GuildCategory
                });

                // Sonra o kategorinin içine kanalları/ses odalarını basıyoruz
                for (const k of veri.kanallar) {
                    await message.guild.channels.create({
                        name: k.name,
                        type: k.type,
                        parent: kategoriKanal.id
                    });
                }
            }

            return message.channel.send("✅ **Tebrikler!** Tüm lig kategorileri, yazı kanalları ve tribün ses odaları **Karagore** altyapısıyla eksiksiz kuruldu.");

        } catch (error) {
            console.error(error);
            return message.channel.send("❌ Kurulum sırasında bir yetki hatası oluştu.");
        }
    }
});

// Bot Tokenini Railway paneline değişken (TOKEN) olarak girmeyi unutma!
client.login(process.env.TOKEN);
                          
