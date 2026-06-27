const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

// Sabit IDs
const OWNER_ROL_ID = '1513269024866304091'; // @everyone atabilen TEK rol (Owner)
const SOHBET_KANAL_ID = '1513271753491616064'; // Küfür edilince bildirim giden kanal

// Engellenen kelimelerin tam listesi
const KUFUR_LISTESI = [
    'amk', 'aq', 'orospu', 'piç', 'sik', 'göt', 'yarrak',
    'prono', 'prona', 'prana', '31', '67', 'anani', 
    'oe', 'œ', 'oropusu', 'orobusu', 'oropusu çocugu'
];

client.once('ready', () => {
    console.log(`🛡️ Güncellenmiş Etiket ve Küfür Koruması Aktif: ${client.user.tag}`);
});

// Çökme Önleyici
process.on('unhandledRejection', (reason, p) => { console.error(reason); });
process.on('uncaughtException', (err, origin) => { console.error(err); });

client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || !message.guild) return;

        // Türkçe karakter uyumluluğu için küçük harfe çevirme
        const mesajIcerikKucuk = message.content.toLowerCase().toLocaleLowerCase('tr-TR');

        // ==========================================
        // 1. EVERYONE / HERE ETİKET KORUMASI
        // ==========================================
        if (message.content.includes('@everyone') || message.content.includes('@here')) {
            // Sadece OWNER rolü olanlar atabilir, diğer herkes cezalandırılır
            const ownerMi = message.member.roles.cache.has(OWNER_ROL_ID);
            
            if (!ownerMi) {
                // Mesajı anında sil
                await message.delete().catch(() => {});

                // 5 Dakika Mute (Timeout)
                const besDakika = 5 * 60 * 1000;
                await message.member.timeout(besDakika, 'Yetkisiz everyone/here etiketi kullanımı.').catch(() => {});

                // Kullanıcıya DM Uyarı
                await message.author.send({
                    content: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ **SUNUCU CEZA UYARISI** ⚠️\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📢 **Sayın** <@${message.author.id}>,\n\nSunucumuzda yetkiniz olmadığı halde \`@everyone\` veya \`@here\` etiketini kullanmaya çalıştığınız tespit edilmiştir.\n\n⏳ **Uygulanan Ceza:** \`5 Dakika Susturma (Mute)\`\n\n👉 *Lütfen sunucu kurallarına riayet ediniz.*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                }).catch(() => {});

                return;
            }
        }

        // ==========================================
        // 2. DISCORD LINK ENGELLEYİCİ (Sadece Silme)
        // ==========================================
        if (mesajIcerikKucuk.includes('discord.gg/') || mesajIcerikKucuk.includes('discord.com/invite/')) {
            if (!message.member.roles.cache.has(OWNER_ROL_ID) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                await message.delete().catch(() => {});
                return;
            }
        }

        // ==========================================
        // 3. KÜFÜR ENGELLEYİCİ (Silme + Mute + Kanal Mesajı)
        // ==========================================
        const ownerVeyaAdmin = message.member.roles.cache.has(OWNER_ROL_ID) || message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        
        if (!ownerVeyaAdmin) {
            const kufurVarMi = KUFUR_LISTESI.some(kufur => {
                const regex = new RegExp(`\\b${kufur}\\b`, 'i');
                return regex.test(mesajIcerikKucuk);
            });

            if (kufurVarMi) {
                // 1. Mesajı sil
                await message.delete().catch(() => {});

                // 2. 5 Dakika Mute at (Timeout)
                const besDakika = 5 * 60 * 1000;
                await message.member.timeout(besDakika, 'Sohbette küfür/argo kullanımı.').catch(() => {});

                // 3. Belirttiğin Sohbet Kanalına bildirim gönder
                const sohbetKanali = client.channels.cache.get(SOHBET_KANAL_ID) || await client.channels.fetch(SOHBET_KANAL_ID).catch(() => null);
                if (sohbetKanali) {
                    await sohbetKanali.send({
                        content: `⚠️ <@${message.author.id}> küfür ettiği için **5 dakika** süreyle susturuldu (mute atıldı).`
                    }).catch(() => {});
                }
                return;
            }
        }

    } catch (error) {
        console.error('Koruma sisteminde hata oluştu:', error);
    }
});

client.login(process.env.TOKEN);

