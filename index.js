const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ]
});

// Gelişmiş Veritabanı Yapısı
const db = {
    bakiye: {},
    butce: {},
    ant: {},
    lastPen: {},
    lastAnt: {},
    davet: {},
    mevki: {},
    deger: {}
};

const PEN_KANAL_ID = "1523040102807372008";
const ANT_KANAL_ID = "1523040102807372005";
const invitesCache = new Map();

// Mevki Bilgi Haritası (Kısaltma -> Tam Ad, Bayrak)
const mevkiHaritasi = {
    'gk': { ad: 'GK', uzunAd: 'Kaleci', bayrak: '🇳🇬' },
    'df': { ad: 'DF', uzunAd: 'Defans', bayrak: '🇹🇷' },
    'os': { ad: 'OS', uzunAd: 'Orta Saha', bayrak: '🇧🇷' },
    'fv': { ad: 'FV', uzunAd: 'Forvet', bayrak: '🇦🇷' }
};

function profilKontrol(userId) {
    if (!db.bakiye[userId]) db.bakiye[userId] = 0;
    if (!db.butce[userId]) db.butce[userId] = 0;
    if (!db.ant[userId]) db.ant[userId] = 0;
    if (!db.mevki[userId]) db.mevki[userId] = "Yok";
    if (!db.deger[userId]) db.deger[userId] = "0M€";
    if (!db.davet[userId]) {
        db.davet[userId] = { gercek: 0, fake: 0, ayrildi: 0, tekrar: 0, davetEden: null };
    }
}

client.on('ready', async () => {
    console.log(`✅ Başarılı: ${client.user.tag} aktif!`);
    for (const guild of client.guilds.cache.values()) {
        try {
            const guildInvites = await guild.invites.fetch();
            invitesCache.set(guild.id, new Map(guildInvites.map(inv => [inv.code, inv.uses])));
        } catch (err) { console.log(`⚠️ Davetler okunamadı: ${guild.name}`); }
    }
});

// --- MEVKİ SEÇME VE OTOMATİK İSİM DEĞİŞTİRME KOMUTU ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('.')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const user = message.author.id;
    
    profilKontrol(user);

    if (cmd === 'mevkisec' || cmd === 'mevki-seç') {
        const secim = args[0]?.toLowerCase();
        if (!secim || !mevkiHaritasi[secim]) {
            return message.reply("❌ Lütfen geçerli bir mevki seçin!\n👉 Kullanım: `.mevkisec [gk / df / os / fv]`");
        }

        const mBilgi = mevkiHaritasi[secim];
        db.mevki[user] = mBilgi.uzunAd;
        db.deger[user] = "1M€"; // Başlangıç değeri

        // Yeni Takma Ad Formatı: KullanıcıAdı | GK | 🇳🇬 | 1M€
        const yeniIsim = `${message.author.username} | ${mBilgi.ad} | ${mBilgi.bayrak} | ${db.deger[user]}`;

        try {
            // Eğer mesajı atan kişi sunucu sahibi (Owner) değilse ismini değiştirir (Owner ismi bottan yüksek yetki olduğu için değişmez)
            if (message.member.manageable) {
                await message.member.setNickname(yeniIsim);
            }
            
            const embed = new EmbedBuilder()
                .setTitle("📝 Mevki Atandı ve İsim Güncellendi!")
                .setDescription(`⚽ **${message.author.username}**, başarıyla **${mBilgi.uzunAd}** mevkisini seçtin!\n\n📌 **Yeni Takma Adın:** \`${yeniIsim}\``)
                .setColor(0x2ECC71)
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            return message.reply(`✅ Mevkiniz **${mBilgi.uzunAd}** olarak kaydedildi ancak yetkim yetmediği için sunucu isminizi değiştiremedim.`);
        }
    }

    // --- PROFİL KOMUTU ---
    if (cmd === 'profil' || cmd === 'profıl') {
        const targetMember = message.mentions.members.first() || message.member;
        profilKontrol(targetMember.id);

        const pBakiye = db.bakiye[targetMember.id] || 0;
        const pButce = db.butce[targetMember.id] || 0;
        const pAnt = db.ant[targetMember.id] || 0;
        const pMevki = db.mevki[targetMember.id];
        const pDeger = db.deger[targetMember.id];
        const pDavet = db.davet[targetMember.id];

        const embed = new EmbedBuilder()
            .setTitle(`👤 ${targetMember.user.username} Oyuncu Kartı`)
            .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
            .setColor(0x1F2023)
            .addFields(
                { name: '📋 Takma Ad', value: `\`${targetMember.displayName}\``, inline: false },
                { name: '🏃‍♂️ Mevki', value: `\`${pMevki}\``, inline: true },
                { name: '📊 Piyasa Değeri', value: `\`${pDeger}\``, inline: true },
                { name: '🏋️‍♂️ Antrenman', value: `\`${pAnt}/10 Aşama\``, inline: true },
                { name: '🪙 Nakit (Cash)', value: `\`${pBakiye.toLocaleString()} Cash\``, inline: true },
                { name: '🏦 Kulüp Bütçesi', value: `\`${pButce.toLocaleString()} Bütçe\``, inline: true },
                { name: '✉️ Davet İstatistikleri', value: `✅ Gerçek: **${pDavet.gercek}** | ❌ Fake: **${pDavet.fake}**\n🚪 Ayrıldı: **${pDavet.ayrildi}** | 🔄 Tekrar: **${pDavet.tekrar}**`, inline: false }
            )
            .setFooter({ text: `Kaliteli Lig Yönetim Sistemi`, iconURL: message.guild.iconURL() })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }

    // --- .PEN KOMUTU ---
    if (cmd === 'pen') {
        if (message.channel.id !== PEN_KANAL_ID) return message.reply(`❌ Bu komut sadece <#${PEN_KANAL_ID}> kanalında kullanılabilir!`);
        const now = Date.now();
        if (db.lastPen[user] && now - db.lastPen[user] < 3600000) {
            return message.reply(`⏱️ Saatte 1 kez penaltı atabilirsin! Kalan: **${Math.ceil((3600000 - (now - db.lastPen[user])) / 60000)}** dk.`);
        }
        const sonuclar = [
            "⚽ **GOL!** Top doksana gitti, kaleci çaresiz!",
            "🧤 **KURTARIŞ!** Kaleci mükemmel uzandı ve topu çeldi!",
            "🥅 **DİREK!** Meşin yuvarlak çataldan geri döndü!",
            "🏟️ **AUT!** Çok sert vuruş ama top dışarı çıkıyor!"
        ];
        db.lastPen[user] = now;
        const embed = new EmbedBuilder().setTitle("🥅 Penaltı Atışı!").setDescription(`**${message.author.displayName}** vuruşunu yaptı...\n\n${sonuclar[Math.floor(Math.random() * sonuclar.length)]}`).setColor(0x3498DB).setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // --- .ANT KOMUTU ---
    if (cmd === 'ant') {
        if (message.channel.id !== ANT_KANAL_ID) return message.reply(`❌ Bu komut sadece <#${ANT_KANAL_ID}> kanalında kullanılabilir!`);
        const now = Date.now();
        if (db.lastAnt[user] && now - db.lastAnt[user] < 3600000) {
            return message.reply(`⏱️ Saatte 1 kez antrenman yapabilirsin! Kalan: **${Math.ceil((3600000 - (now - db.lastAnt[user])) / 60000)}** dk.`);
        }
        db.ant[user] = (db.ant[user] || 0) + 1;
        db.lastAnt[user] = now;
        const embed = new EmbedBuilder().setColor(0xE67E22).setTimestamp();
        if (db.ant[user] >= 10) {
            db.ant[user] = 0;
            // Antrenman 10/10 olunca piyasa değerini arttırabiliriz (İsteğe bağlı)
            embed.setTitle("🏃‍♂️ Antrenman Tamamlandı!").setDescription(`🎉 **${message.author.displayName}**! \`10/10\` seviyeye ulaştın, antrenman sıfırlandı.`);
        } else {
            embed.setTitle("🏋️‍♂️ Antrenman Yapıldı").setDescription(`**${message.author.displayName}**, ilerleme durumu: \`${db.ant[user]}/10\``);
        }
        return message.channel.send({ embeds: [embed] });
    }

    // --- DİĞER KOMUTLAR (YARDIM/BAL/DAVET) ---
    if (cmd === 'bal' || cmd === 'bütçe' || cmd === 'butce') {
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle(`🪙 ${message.author.displayName} Bakiye`).setColor(0x2ECC71).addFields({ name: '💵 Cash', value: `\`${(db.bakiye[user] || 0).toLocaleString()}\``, inline: true }, { name: '📊 Bütçe', value: `\`${(db.butce[user] || 0).toLocaleString()}\``, inline: true })] });
    }

    if (cmd === 'yardım' || cmd === 'yardim') {
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("🤖 Yardım Menüsü").setColor(0xE74C3C).addFields({ name: '👤 Oyuncu', value: '`.mevkisec [gk/df/os/fv]` -> İsminizi otomatik düzenler.\n`.profil` -> Kartınızı gösterir.' }, { name: '⚽ Lig', value: '`.pen` -> Penaltı atar.\n`.ant` -> Antrenman yapar.' })] });
    }
});

// -yardım kontrolü
client.on('messageCreate', async (message) => {
    if (message.content.toLowerCase() === '-yardım' || message.content.toLowerCase() === '-yardim') {
        client.emit('messageCreate', Object.assign({}, message, { content: '.yardım' }));
    }
});

// Davet tetikleyicileri (Önceki kodla aynı)
client.on('guildMemberAdd', async (member) => {
    profilKontrol(member.id);
    try {
        const newInvites = await member.guild.invites.fetch();
        const oldInvites = invitesCache.get(member.guild.id);
        invitesCache.set(member.guild.id, new Map(newInvites.map(inv => [inv.code, inv.uses])));
        if (!oldInvites) return;
        const usedInvite = newInvites.find(inv => inv.uses > (oldInvites.get(inv.code) || 0));
        if (usedInvite && usedInvite.inviter) {
            const inviterId = usedInvite.inviter.id; profilKontrol(inviterId);
            if ((Date.now() - member.user.createdTimestamp) < 7 * 24 * 60 * 60 * 1000) { db.davet[inviterId].fake += 1; }
            else { db.davet[inviterId].gercek += 1; }
            db.davet[member.id].davetEden = inviterId;
        }
    } catch (e) {}
});

client.on('guildMemberRemove', async (member) => {
    profilKontrol(member.id); const inviterId = db.davet[member.id].davetEden;
    if (inviterId && db.davet[inviterId]) { db.davet[inviterId].ayrildi += 1; if (db.davet[inviterId].gercek > 0) db.davet[inviterId].gercek -= 1; }
});

client.login(process.env.DISCORD_TOKEN);

