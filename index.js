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

// Gelişmiş Veritabanı Yapısı (Bellek İçi)
const db = {
    bakiye: {},
    butce: {},
    ant: {},
    lastPen: {},
    lastAnt: {},
    davet: {}
};

// BELİRTTİĞİN ÖZEL KANAL ID'LERİ
const PEN_KANAL_ID = "1523040102807372008";
const ANT_KANAL_ID = "1523040102807372005";

// Davet Takip Sistemi Önbelleği
const invitesCache = new Map();

// Yardımcı Fonksiyonlar
function profilKontrol(userId) {
    if (!db.bakiye[userId]) db.bakiye[userId] = 0;
    if (!db.butce[userId]) db.butce[userId] = 0;
    if (!db.ant[userId]) db.ant[userId] = 0;
    if (!db.davet[userId]) {
        db.davet[userId] = { gercek: 0, fake: 0, ayrildi: 0, tekrar: 0, davetEden: null };
    }
}

// BOT HAZIR OLDUĞUNDA DAVETLERİ ÖNBELLEĞE AL
client.on('ready', async () => {
    console.log(`✅ Başarılı: ${client.user.tag} aktif ve göreve hazır!`);
    
    for (const guild of client.guilds.cache.values()) {
        try {
            const guildInvites = await guild.invites.fetch();
            invitesCache.set(guild.id, new Map(guildInvites.map(inv => [inv.code, inv.uses])));
        } catch (err) {
            console.log(`⚠️ ${guild.name} sunucusunun davetleri okunamadı.`);
        }
    }
});

// YENİ BİRİ KATILDIĞINDA (DAVET TAKİBİ - DÜZELTİLDİ)
client.on('guildMemberAdd', async (member) => {
    profilKontrol(member.id);
    try {
        const newInvites = await member.guild.invites.fetch();
        const oldInvites = invitesCache.get(member.guild.id);
        invitesCache.set(member.guild.id, new Map(newInvites.map(inv => [inv.code, inv.uses])));

        if (!oldInvites) return;

        const usedInvite = newInvites.find(inv => inv.uses > (oldInvites.get(inv.code) || 0));
        if (usedInvite && usedInvite.inviter) {
            const inviterId = usedInvite.inviter.id;
            profilKontrol(inviterId);

            // Hesap 7 günden taze ise FAKE sayılır
            const isFake = (Date.now() - member.user.createdTimestamp) < 7 * 24 * 60 * 60 * 1000;

            if (isFake) {
                db.davet[inviterId].fake += 1;
            } else {
                // Yeniden giriş kontrolü
                if (db.davet[member.id].davetEden === inviterId) {
                    db.davet[inviterId].tekrar += 1;
                    db.davet[inviterId].gercek += 1;
                } else {
                    db.davet[inviterId].gercek += 1;
                }
            }
            db.davet[member.id].davetEden = inviterId;
        }
    } catch (err) {
        console.error(err);
    }
});

// BİRİ AYRILDIĞINDA
client.on('guildMemberRemove', async (member) => {
    profilKontrol(member.id);
    const inviterId = db.davet[member.id].davetEden;
    if (inviterId && db.davet[inviterId]) {
        db.davet[inviterId].ayrildi += 1;
        if (db.davet[inviterId].gercek > 0) db.davet[inviterId].gercek -= 1;
    }
});

// KOMUT KONTROLLERİ
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('.')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const user = message.author.id;
    
    profilKontrol(user);

    // 🏆 .profıl / .profil (GELİŞMİŞ PROFİL SİSTEMİ)
    if (cmd === 'profil' || cmd === 'profıl') {
        const targetMember = message.mentions.members.first() || message.member;
        profilKontrol(targetMember.id);

        const pBakiye = db.bakiye[targetMember.id] || 0;
        const pButce = db.butce[targetMember.id] || 0;
        const pAnt = db.ant[targetMember.id] || 0;
        const pDavet = db.davet[targetMember.id];

        const embed = new EmbedBuilder()
            .setTitle(`👤 ${targetMember.user.username} Oyuncu Profili`)
            .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
            .setColor(0x2F3136) // Kaliteli Koyu Tema
            .addFields(
                { name: '📋 İsim / Takma Ad', value: `\`${targetMember.displayName}\``, inline: true },
                { name: '🪙 Nakit Bakiye', value: `\`${pBakiye.toLocaleString()} Cash\``, inline: true },
                { name: '📊 Kulüp Bütçesi', value: `\`${pButce.toLocaleString()} Bütçe\``, inline: true },
                { name: '🏃‍♂️ Antrenman Durumu', value: `\`${pAnt}/10 Aşama\``, inline: true },
                { name: '✉️ Davet İstatistikleri', value: `✅ Gerçek: **${pDavet.gercek}**\n❌ Fake: **${pDavet.fake}**\n🚪 Ayrıldı: **${pDavet.ayrildi}**\n🔄 Tekrar: **${pDavet.tekrar}**`, inline: false }
            )
            .setFooter({ text: `${message.guild.name} • Kaliteli Oyuncu Kartı`, iconURL: message.guild.iconURL() })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }

    // ⚽ .pen (SADECE BELİRLİ KANALDA VE SAATLİK)
    if (cmd === 'pen') {
        if (message.channel.id !== PEN_KANAL_ID) {
            return message.reply(`❌ Bu komut sadece <#${PEN_KANAL_ID}> kanalında kullanılabilir!`);
        }

        const now = Date.now();
        if (db.lastPen[user] && now - db.lastPen[user] < 3600000) {
            const kalanDk = Math.ceil((3600000 - (now - db.lastPen[user])) / 60000);
            return message.reply(`⏱️ Saatte 1 kez penaltı atabilirsin! Kalan süre: **${kalanDk}** dakika.`);
        }

        const sonuclar = [
            "⚽ **GOL!** Top doksana gitti, kaleci çaresiz!",
            "🧤 **KURTARIŞ!** Kaleci mükemmel uzandı ve topu çeldi!",
            "🥅 **DİREK!** Meşin yuvarlak çataldan geri döndü!",
            "🏟️ **AUT!** Çok sert vuruş ama top dışarı çıkıyor!"
        ];
        const secilen = sonuclar[Math.floor(Math.random() * sonuclar.length)];
        db.lastPen[user] = now;

        const embed = new EmbedBuilder()
            .setTitle("🥅 Penaltı Atışı!")
            .setDescription(`**${message.author.displayName}** penaltı noktasından vuruşunu yaptı...\n\n${secilen}`)
            .setColor(0x3498DB)
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }

    // 🏃‍♂️ .ant (SADECE BELİRLİ KANALDA VE SAATLİK)
    if (cmd === 'ant') {
        if (message.channel.id !== ANT_KANAL_ID) {
            return message.reply(`❌ Bu komut sadece <#${ANT_KANAL_ID}> kanalında kullanılabilir!`);
        }

        const now = Date.now();
        if (db.lastAnt[user] && now - db.lastAnt[user] < 3600000) {
            const kalanDk = Math.ceil((3600000 - (now - db.lastAnt[user])) / 60000);
            return message.reply(`⏱️ Saatte 1 kez antrenman yapabilirsin! Kalan süre: **${kalanDk}** dakika.`);
        }

        db.ant[user] = (db.ant[user] || 0) + 1;
        db.lastAnt[user] = now;

        const embed = new EmbedBuilder().setColor(0xE67E22).setTimestamp();

        if (db.ant[user] >= 10) {
            db.ant[user] = 0;
            embed.setTitle("🏃‍♂️ Antrenman Tamamlandı!")
                .setDescription(`🎉 Tebrikler **${message.author.displayName}**! \`10/10\` seviyeye ulaştın ve antrenman başarıyla sıfırlandı.`);
        } else {
            embed.setTitle("🏋️‍♂️ Antrenman Yapıldı")
                .setDescription(`**${message.author.displayName}**, sıkı çalışmaya devam ediyorsun!\n İlerleme durumu: \`${db.ant[user]}/10\``);
        }

        return message.channel.send({ embeds: [embed] });
    }

    // 🪙 .bal / .bütçe (EKONOMİ)
    if (cmd === 'bal' || cmd === 'bütçe' || cmd === 'butce') {
        const bakiye = db.bakiye[user] || 0;
        const butce = db.butce[user] || 0;
        
        const embed = new EmbedBuilder()
            .setTitle(`🪙 ${message.author.displayName} Cüzdan & Bütçe`)
            .setColor(0x2ECC71)
            .addFields(
                { name: '💵 Kişisel Nakit (Cash)', value: `\`${bakiye.toLocaleString()}\` Cash`, inline: true },
                { name: '📊 Kulüp/Mevcut Bütçe', value: `\`${butce.toLocaleString()}\` Bütçe`, inline: true }
            );

        return message.channel.send({ embeds: [embed] });
    }

    // ✉️ .davet
    if (cmd === 'davet') {
        const target = message.mentions.members.first() || message.member;
        profilKontrol(target.id);
        const d = db.davet[target.id];

        const embed = new EmbedBuilder()
            .setTitle(`✉️ ${target.displayName} Davet Bilgileri`)
            .setColor(0x9B59B6)
            .addFields(
                { name: '✅ Gerçek Davet', value: `\`${d.gercek}\` kişi`, inline: true },
                { name: '❌ Fake Davet', value: `\`${d.fake}\` kişi`, inline: true },
                { name: '🚪 Ayrılanlar', value: `\`${d.ayrildi}\` kişi`, inline: true },
                { name: '🔄 Tekrar Girenler', value: `\`${d.tekrar}\` kişi`, inline: true }
            );
        return message.channel.send({ embeds: [embed] });
    }

    // 🏆 .davetsirala
    if (cmd === 'davetsirala' || cmd === 'davetsırala') {
        const sorted = Object.entries(db.davet)
            .sort((a, b) => b[1].gercek - a[1].gercek)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle("🏆 En İyi 10 Davet Sıralaması")
            .setColor(0xF1C40F);

        let sıraMetni = "";
        let sayac = 1;

        for (const [userId, data] of sorted) {
            const member = message.guild.members.cache.get(userId);
            if (member) {
                sıraMetni += `**${sayac}.** ${member.displayName} — Gerçek: \`${data.gercek}\` | Fake: \`${data.fake}\` | Ayrılan: \`${data.ayrildi}\`\n`;
                sayac++;
            }
        }

        embed.setDescription(sıraMetni || "Henüz davet verisi toplanmadı.");
        return message.channel.send({ embeds: [embed] });
    }

    // 📖 .yardım / -yardım
    if (cmd === 'yardım' || cmd === 'yardim') {
        const embed = new EmbedBuilder()
            .setTitle("🤖 Yardım Menüsü & Tüm Komutlar")
            .setDescription("Tüm komutlar en güncel ve hatasız halleriyle aşağıda listelenmiştir.")
            .setColor(0xE74C3C)
            .addFields(
                { name: '👤 Oyuncu & Bilgi', value: '`.profil` -> Kaliteli oyuncu kartınızı ve durumunuzu gösterir.\n`.davet` -> Davet istatistiklerinizi açar.\n`.davetsirala` -> Sunucunun ilk 10 davet liderini sıralar.' },
                { name: '⚽ Lig & Eğlence (Ödülsüz)', value: '`.pen` -> Belirlenen kanalda saatlik penaltı atarsınız (Gol/Kurtarış/Direk/Aut).\n`.ant` -> Belirlenen kanalda saatlik 10/1 aşamalı antrenman yaparsınız.' },
                { name: '🪙 Ekonomi', value: '`.bal` ya da `.bütçe` -> Mevcut paranızı ve kulüp bütçenizi gösterir.\n`.send @üye [miktar]` -> Başka bir oyuncuya para transfer eder.' }
            );

        if (message.member.permissions.has('Administrator')) {
            embed.addFields({ name: '👑 Owner / Yönetici Yetkileri', value: '`.paraver @üye [miktar]` / `.parasil @üye [miktar]`\n`.bütçe ekle @üye [miktar]` / `.bütçe sil @üye [miktar]`\n`.davetal @üye [miktar]` / `.davetsil @üye [miktar]`' });
        }

        return message.channel.send({ embeds: [embed] });
    }
});

// AYNI KOMUTUN TETİKLENMESİ İÇİN -yardım SİSTEMİ
client.on('messageCreate', async (message) => {
    if (message.content.toLowerCase() === '-yardım' || message.content.toLowerCase() === '-yardim') {
        const args = message.content.slice(1).trim().split(/ +/);
        client.emit('messageCreate', Object.assign({}, message, { content: '.yardım' }));
    }
});

client.login(process.env.DISCORD_TOKEN);
        
