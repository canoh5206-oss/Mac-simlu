const { Client, GatewayIntentBits, PermissionsBitField, AuditLogEvent } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildExpressions
    ]
});

// Sabit IDs
const OWNER_ROL_ID = '1513269024866304091'; 
const MUAF_ROL_ID = '1513269573451911259';  
const SOHBET_KANAL_ID = '1513271753491616064'; 
const LOG_KANAL_ID = '1520499476123488373'; // Tüm logların akacağı kanal

// Engellenen kelimelerin tam listesi
const KUFUR_LISTESI = [
    'amk', 'aq', 'orospu', 'piç', 'sik', 'göt', 'yarrak',
    'prono', 'prona', 'prana', '31', '67', 'anani', 
    'oe', 'œ', 'oropusu', 'orobusu', 'oropusu çocugu'
];

client.once('ready', () => {
    console.log(`🛡️ Koruma ve Full Log Sistemi Aktif kanka: ${client.user.tag}`);
});

// Çökme Önleyiciler
process.on('unhandledRejection', (reason, p) => { console.error(reason); });
process.on('uncaughtException', (err, origin) => { console.error(err); });

// Log kanalına mesaj gönderen yardımcı fonksiyon
async function logGonder(metin) {
    try {
        const kanal = client.channels.cache.get(LOG_KANAL_ID) || await client.channels.fetch(LOG_KANAL_ID).catch(() => null);
        if (kanal) {
            await kanal.send({ content: metin, allowedMentions: { users: [] } });
        }
    } catch (e) { console.error("Log gönderilemedi:", e); }
}

// ==========================================
// KORUMA SİSTEMLERİ (MESSAGE CREATE)
// ==========================================
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || !message.guild) return;

        const mesajIcerikKucuk = message.content.toLowerCase().toLocaleLowerCase('tr-TR');
        const yetkiliMi = message.member.roles.cache.has(OWNER_ROL_ID) || message.member.roles.cache.has(MUAF_ROL_ID);

        if (!yetkiliMi) {
            // 1. Everyone / Here / Herw Koruması
            if (message.content.includes('@everyone') || message.content.includes('@here') || mesajIcerikKucuk.includes('@herw')) {
                await message.delete().catch(() => {});
                const besDakika = 5 * 60 * 1000;
                await message.member.timeout(besDakika, 'Yetkisiz duyuru/etiket kullanımı.').catch(() => {});
                await message.author.send({
                    content: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ **SUNUCU CEZA UYARISI** ⚠️\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📢 **Sayın** <@${message.author.id}>,\n\nSunucumuzda yetkiniz olmadığı halde etiket veya duyuru kelimelerini (\`@everyone\`, \`@here\`, \`@herw\`) kullanmaya çalıştığınız tespit edilmiştir.\n\n⏳ **Uygulanan Ceza:** \`5 Dakika Susturma (Mute)\`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                }).catch(() => {});
                return;
            }

            // 2. Normal Rol Etiket Koruması
            if (message.mentions.roles.size > 0) {
                await message.delete().catch(() => {});
                return;
            }

            // 3. Discord Link Engelleyici
            if (mesajIcerikKucuk.includes('discord.gg/') || mesajIcerikKucuk.includes('discord.com/invite/')) {
                await message.delete().catch(() => {});
                return;
            }

            // 4. Küfür Engelleyici
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                const kufurVarMi = KUFUR_LISTESI.some(kufur => {
                    const regex = new RegExp(`\\b${kufur}\\b`, 'i');
                    return regex.test(mesajIcerikKucuk);
                });

                if (kufurVarMi) {
                    await message.delete().catch(() => {});
                    const besDakika = 5 * 60 * 1000;
                    await message.member.timeout(besDakika, 'Sohbette küfür/argo kullanımı.').catch(() => {});

                    const sohbetKanali = client.channels.cache.get(SOHBET_KANAL_ID) || await client.channels.fetch(SOHBET_KANAL_ID).catch(() => null);
                    if (sohbetKanali) {
                        await sohbetKanali.send({ content: `⚠️ <@${message.author.id}> küfür ettiği için **5 dakika** süreyle susturuldu (mute atıldı).` }).catch(() => {});
                    }
                    return;
                }
            }
        }
    } catch (error) { console.error(error); }
});

// ==========================================
// 📥 18145.jpg & 18144.jpg LOG OLAYLARI 📥
// ==========================================

// --- ÜYE LOGLARI ---
client.on('guildMemberAdd', (member) => {
    logGonder(`📥 **[Üye Katıldı]** ${member.user.tag} (${member.id}) sunucuya giriş yaptı.`);
});

client.on('guildMemberRemove', (member) => {
    logGonder(`📤 **[Üye Ayrıldı]** ${member.user.tag} (${member.id}) sunucudan ayrıldı.`);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    // Kullanıcı adı (Nickname) Güncellendi
    if (oldMember.nickname !== newMember.nickname) {
        logGonder(`📝 **[Kullanıcı Adı Güncellendi]** **${newMember.user.tag}** eski adı: \`${oldMember.nickname || 'Yok'}\` -> yeni adı: \`${newMember.nickname || 'Yok'}\``);
    }
    // Üye Rolleri Güncellendi
    if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
        const eklenenler = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id)).map(r => r.name);
        const silinenler = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id)).map(r => r.name);
        if (eklenenler.length) logGonder(`🛡️ **[Üye Rolleri Güncellendi]** **${newMember.user.tag}** kullanıcısına **${eklenenler.join(', ')}** rolü verildi.`);
        if (silinenler.length) logGonder(`🛡️ **[Üye Rolleri Güncellendi]** **${newMember.user.tag}** kullanıcısından **${silinenler.join(', ')}** rolü alındır.`);
    }
    // Üye Susturuldu / Susturması Kaldırıldı (Timeout / Mute)
    if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
        if (newMember.communicationDisabledUntilTimestamp && newMember.communicationDisabledUntilTimestamp > Date.now()) {
            logGonder(`🔇 **[Üye Susturuldu]** **${newMember.user.tag}** adlı kullanıcı susturuldu.`);
        } else if (!newMember.communicationDisabledUntilTimestamp && oldMember.communicationDisabledUntilTimestamp) {
            logGonder(`🔊 **[Üye Susturması Kaldırıldı]** **${newMember.user.tag}** adlı kullanıcının susturması bitti/kaldırıldı.`);
        }
    }
});

// --- MODERATÖR LOGLARI (Yasaklama, Kaldırma, Atılma) ---
client.on('guildBanAdd', async (ban) => {
    setTimeout(async () => {
        const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
        const banLog = fetchedLogs?.entries.first();
        const moderator = banLog ? banLog.executor.tag : 'Bilinmiyor';
        logGonder(`🔨 **[Üye Yasaklandı]** **${ban.user.tag}**, **${moderator}** tarafından sunucudan yasaklandı.`);
    }, 1000);
});

client.on('guildBanRemove', async (ban) => {
    setTimeout(async () => {
        const fetchedLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove }).catch(() => null);
        const unbanLog = fetchedLogs?.entries.first();
        const moderator = unbanLog ? unbanLog.executor.tag : 'Bilinmiyor';
        logGonder(`🔓 **[Üye Yasağı Kaldırıldı]** **${ban.user.tag}** kullanıcısının yasağı **${moderator}** tarafından kaldırıldı.`);
    }, 1000);
});

// Üye Atıldı Logu (Kick)
client.on('guildMemberRemove', async (member) => {
    setTimeout(async () => {
        const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick }).catch(() => null);
        const kickLog = fetchedLogs?.entries.first();
        if (kickLog && kickLog.target.id === member.id && kickLog.createdAt > (Date.now() - 5000)) {
            logGonder(`🥾 **[Üye Atıldı]** **${member.user.tag}**, **${kickLog.executor.tag}** tarafından sunucudan atıldı (Kick).`);
        }
    }, 1000);
});

// --- MESAJ LOGLARI ---
client.on('messageUpdate', (oldMessage, newMessage) => {
    if (oldMessage.author?.bot || oldMessage.content === newMessage.content) return;
    logGonder(`✏️ **[Mesaj Güncellendi]** **${oldMessage.author?.tag}** (<#${oldMessage.channelId}>):\n Eski: \`${oldMessage.content}\` \n Yeni: \`${newMessage.content}\``);
});

client.on('messageDelete', (message) => {
    if (message.author?.bot) return;
    logGonder(`🗑️ **[Mesaj Silindi]** **${message.author?.tag || 'Bilinmeyen Kullanıcı'}** (<#${message.channelId}>): \`${message.content || 'İçerik yok (Dosya/Embed olabilir)'}\``);
});

// --- SUNUCU LOGLARI ---
client.on('guildUpdate', (oldGuild, newGuild) => {
    logGonder(`🌐 **[Sunucu Güncellendi]** Sunucu ayarlarında veya isminde değişiklik yapıldı.`);
});

// --- EMOJİ LOGLARI ---
client.on('emojiCreate', (emoji) => {
    logGonder(`😀 **[Emoji Oluşturuldu]** \`${emoji.name}\` adlı yeni bir emoji eklendi.`);
});
client.on('emojiUpdate', (oldEmoji, newEmoji) => {
    logGonder(`🔄 **[Emoji Güncellendi]** \`${oldEmoji.name}\` emojisinin adı \`${newEmoji.name}\` olarak değiştirildi.`);
});
client.on('emojiDelete', (emoji) => {
    logGonder(`❌ **[Emoji Silindi]** \`${emoji.name}\` emojisi sunucudan kaldırıldı.`);
});

// --- KANAL LOGLARI ---
client.on('channelCreate', (channel) => {
    logGonder(`📁 **[Kanal Oluşturuldu]** <#${channel.id}> (\`${channel.name}\`) kanalı açıldı.`);
});
client.on('channelUpdate', (oldChannel, newChannel) => {
    if (oldChannel.name !== newChannel.name) {
        logGonder(`⚙️ **[Kanal Güncellendi]** Kanal adı değiştirildi: \`${oldChannel.name}\` -> \`${newChannel.name}\``);
    }
});
client.on('channelDelete', (channel) => {
    logGonder(`🔥 **[Kanal Silindi]** \`${channel.name}\` adlı kanal kalıcı olarak silindi.`);
});

// --- ROL LOGLARI ---
client.on('roleCreate', (role) => {
    logGonder(`🎀 **[Rol Oluşturuldu]** \`${role.name}\` adlı yeni bir rol var edildi.`);
});
client.on('roleUpdate', (oldRole, newRole) => {
    if (oldRole.name !== newRole.name) {
        logGonder(`🔀 **[Rol Güncellendi]** Rol ismi değişti: \`${oldRole.name}\` -> \`${newRole.name}\``);
    }
});
client.on('roleDelete', (role) => {
    logGonder(`💥 **[Rol Silindi]** \`${role.name}\` adlı rol sunucudan silindi.`);
});

client.login(process.env.TOKEN);
          
                        
                
