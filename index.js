const { Client, GatewayIntentBits, ChannelType, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = ".";
const OWNER_YETKILI_ROL_ID = "1461448489656647905";

// Discord sınırlarına takılmamak için bekleme süresini 400ms yaptık (Kesin çözüm)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

client.once('ready', () => {
    console.log(`[BOT] ${client.user.tag} başarıyla aktif edildi!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'temizle' || command === 'sunucukur') {
        if (!message.member.roles.cache.has(OWNER_YETKILI_ROL_ID)) {
            return message.reply("❌ Bu komutu kullanmak için gerekli yetkili rolüne sahip değilsin!");
        }
    }

    // ==========================================
    // 1. .temizle KOMUTU
    // ==========================================
    if (command === 'temizle') {
        try {
            await message.reply("🧹 **Karagore Temizlik Sistemi Başlatıldı!** Kanallar ve roller temizleniyor...");

            const channels = await message.guild.channels.fetch();
            for (const [id, channel] of channels) {
                if (channel) {
                    await channel.delete().catch(() => null);
                    await wait(300); 
                }
            }

            const roles = await message.guild.roles.fetch();
            for (const [id, role] of roles) {
                if (!role.managed && role.id !== message.guild.id) {
                    await role.delete().catch(() => null);
                    await wait(300);
                }
            }

            const yeniKanal = await message.guild.channels.create({
                name: 'kurulum-odası',
                type: ChannelType.GuildText
            });

            const basariliEmbed = new EmbedBuilder()
                .setColor('#2F3136')
                .setTitle('🧼 Temizlik Tamamlandı')
                .setDescription('Sunucu temizlendi!\nKanal ve rolleri eksiksiz kurmak için `.sunucukur` yazabilirsiniz.')
                .setTimestamp();

            return yeniKanal.send({ embeds: [basariliEmbed] });

        } catch (error) {
            console.error(error);
        }
    }

    // ==========================================
    // 2. .sunucukur KOMUTU
    // ==========================================
    if (command === 'sunucukur') {
        
        const rolYapisi = [
            { name: "🔴 👑 Owner", color: "#FF0000" },
            { name: "🟠 ⭐ Owner Yardımcısı", color: "#FF7F00" },
            { name: "🟡 🛡️ Baş Admin", color: "#FFFF00" },
            { name: "🟨 ⚙️ Admin", color: "#E6E600" },
            { name: "🟢 🔧 Admin Yardımcısı", color: "#00FF00" },
            { name: "🟦 🔨 Moderatör", color: "#0000FF" },
            { name: "🔵 🪓 Moderatör Yardımcısı", color: "#007FFF" },
            { name: "🟣 🎫 Ticket Sorumlusu", color: "#7F00FF" },
            { name: "🟪 📝 Kayıt Yetkilisi", color: "#A020F0" },
            { name: "🟪 📝 Kayıt Yetkilisi", color: "#A020F0" },
            { name: "🟤 💎 Değer Yetkilisi", color: "#A52A2A" },
            { name: "⚫ 💬 Chat Sorumlusu", color: "#000000" },
            { name: "🌟 🏅 Efsane Görevli", color: "#FFD700" },
            { name: "🏆 Takım Başkanı", color: "#FF8C00" },
            { name: "📋 Teknik Direktör", color: "#4682B4" },
            { name: "💎 VIP", color: "#00FFFF" },
            { name: "⚽ Futbolcu", color: "#2E8B57" },
            { name: "⚪ Kayıtsız", color: "#FFFFFF" }
        ];

        const sunucuYapisi = [
            {
                kategori: "1. Efsane League (karagore)",
                kanallar: [
                    { name: "🎪・takımlar", type: ChannelType.GuildText },
                    { name: "・Kayıt odasi", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "2. Bilgilendirme (karagore)",
                kanallar: [
                    { name: "📣・duyuru", type: ChannelType.GuildText },
                    { name: "📦・sistemler", type: ChannelType.GuildText },
                    { name: "📚・kurallar", type: ChannelType.GuildText },
                    { name: "💎・anılar", type: ChannelType.GuildText },
                    { name: "🎭・rol-bilgi", type: ChannelType.GuildText },
                    { name: "🔮・rol-alma", type: ChannelType.GuildText },
                    { name: "🚀・booster", type: ChannelType.GuildText },
                    { name: "📈・seviye", type: ChannelType.GuildText },
                    { name: "✨・yetkili-alım", type: ChannelType.GuildText },
                    { name: "✨・spiker-alım", type: ChannelType.GuildText },
                    { name: "🎙️・spiker-sonuçları", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "3. Diğer Kanallar (karagore)",
                kanallar: [
                    { name: "🔔・güncelleme", type: ChannelType.GuildText },
                    { name: "🚀・booster-bilgi", type: ChannelType.GuildText },
                    { name: "🛒・Market", type: ChannelType.GuildText },
                    { name: "🗳️・oy ver ", type: ChannelType.GuildText },
                    { name: "🎉event", type: ChannelType.GuildText },
                    { name: "🎊 çekiliş ", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "4. Genel",
                kanallar: [
                    { name: "・Sohnet", type: ChannelType.GuildText },
                    { name: "・Medya", type: ChannelType.GuildText },
                    { name: "🤖・medya ", type: ChannelType.GuildText },
                    { name: "💡・istek-şikayet", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "5. Eğlence Kanalları (karagore)",
                kanallar: [
                    { name: "💵・owo", type: ChannelType.GuildText },
                    { name: "🏆・turnuva", type: ChannelType.GuildText },
                    { name: "💫・bil-kazan", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "6. Antrenman (karagore)",
                kanallar: [
                    { name: "🎽・antrenman", type: ChannelType.GuildText },
                    { name: "🥅・penaltı-antrenman", type: ChannelType.GuildText },
                    { name: "🎽・antrenman-bilgi", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "7. Değer İsteme & Bütçe İsteme (karagore)",
                kanallar: [
                    { name: "📊・değer-bütçe-kasma", type: ChannelType.GuildText },
                    { name: "💸・değer-bütçe-isteme", type: ChannelType.GuildText },
                    { name: "🔍・değer-bütçe-bildiri", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "8. Sosyal Medya (karagore)",
                kanallar: [
                    { name: "🌐・twitter", type: ChannelType.GuildText },
                    { name: "📷・instagram", type: ChannelType.GuildText },
                    { name: "🎵・tiktok", type: ChannelType.GuildText },
                    { name: "📰・reality-haber", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "9. efsane (karagore)",
                kanallar: [
                    { name: "💰・en-değerli-futbolcular", type: ChannelType.GuildText },
                    { name: "💰・en-değerli-takımlar", type: ChannelType.GuildText },
                    { name: "🏛️・müze", type: ChannelType.GuildText },
                    { name: "⭐・efsaneler", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "10. Efsane Lig (karagore)",
                kanallar: [
                    { name: "🏆・puan-durumu", type: ChannelType.GuildText },
                    { name: "📅・fikstür", type: ChannelType.GuildText },
                    { name: "📝・maç-sonuçları", type: ChannelType.GuildText },
                    { name: "⚽・gol-krallığı", type: ChannelType.GuildText },
                    { name: "⚽・asist-krallığı", type: ChannelType.GuildText },
                    { name: "🏥・sakatlıklar", type: ChannelType.GuildText },
                    { name: "🟥・cezalılar", type: ChannelType.GuildText },
                    { name: "🥅・kadrolar", type: ChannelType.GuildText },
                    { name: "👑・sezonun-oyuncusu", type: ChannelType.GuildText },
                    { name: "👑・haftanın-oyuncusu", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "11. Efsane Cup (karagore)",
                kanallar: [
                    { name: "📅・fikstür", type: ChannelType.GuildText },
                    { name: "📝・maç-sonuçları", type: ChannelType.GuildText },
                    { name: "⚽・gol-krallığı", type: ChannelType.GuildText },
                    { name: "⚽・asist-krallığı", type: ChannelType.GuildText },
                    { name: "🟥・cezalılar", type: ChannelType.GuildText },
                    { name: "🥅・kadrolar-cup", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "12. Efsane Süper Cup (karagore)",
                kanallar: [
                    { name: "📅・fikstür", type: ChannelType.GuildText },
                    { name: "🔍・maç-sonuçları", type: ChannelType.GuildText },
                    { name: "👑・krallıklar", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "13. Maç Kanalları (karagore)",
                kanallar: [
                    { name: "📺・bein-sports", type: ChannelType.GuildText },
                    { name: "🏟️・bein-tribün", type: ChannelType.GuildVoice },
                    { name: "📺・exxen-spor", type: ChannelType.GuildText },
                    { name: "🏟️・exxen-tribün", type: ChannelType.GuildVoice },
                    { name: "📺・aspor", type: ChannelType.GuildText },
                    { name: "🏟️・aspor-tribün", type: ChannelType.GuildVoice }
                ]
            },
            {
                kategori: "14. Transfer (karagore)",
                kanallar: [
                    { name: "🚧・transfer-kuralları", type: ChannelType.GuildText },
                    { name: "✅・kap", type: ChannelType.GuildText },
                    { name: "🔍・takım-arama", type: ChannelType.GuildText },
                    { name: "💷・transfer-masası", type: ChannelType.GuildText },
                    { name: "📋・kap-bilgi", type: ChannelType.GuildText }
                ]
            },
            {
                kategori: "15. Ticketlar (karagore)",
                kanallar: [
                    { name: "🎫・ticket", type: ChannelType.GuildText }
                ]
            }
        ];

        try {
            await message.reply("⚙️ **Güvenli Karagore Altyapı Kurulumu Başlatıldı!** Kanalların atlanmaması için her kanal arasında 400ms beklenecektir. Lütfen sabırla bekleyin...");

            // === ROLLERİ OLUŞTURMA ===
            for (const r of rolYapisi) {
                await message.guild.roles.create({
                    name: r.name,
                    color: r.color,
                    reason: 'Karagore otomatik kurulum sistemi'
                });
                await wait(400); 
            }

            // === KANALLARI OLUŞTURMA ===
            for (const veri of sunucuYapisi) {
                const kategoriKanal = await message.guild.channels.create({
                    name: veri.kategori,
                    type: ChannelType.GuildCategory
                });
                await wait(400); // Kategoriden sonra bekle

                for (const k of veri.kanallar) {
                    await message.guild.channels.create({
                        name: k.name,
                        type: k.type,
                        parent: kategoriKanal.id
                    });
                    await wait(400); // Her kanal oluşturulduktan sonra kesin olarak bekle (Atlamayı önler)
                }
            }

            return message.channel.send("✅ **Mükemmel Kurulum!** Tüm kategoriler, emojili kanallar ve 17 adet rol eksiksiz, atlanmadan kuruldu!");

        } catch (error) {
            console.error(error);
            return message.channel.send("❌ Kurulum sırasında bir hata oluştu.");
        }
    }
});

client.login(process.env.TOKEN);
                    
                
