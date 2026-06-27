    
    

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

// Sabit Rol IDs
const OWNER_ROL_ID = '1513269024866304091'; // @everyone atabilen tek rol
const FUTBOLCU_ROL_ID = '1512130383070892094'; // @everyone atamayan, ceza alacak rol

// Basit Küfür Listesi (İstediğin kelimeleri buraya ekleyebilirsin kanka)
const KUFUR_LISTESI = ['amk', 'aq', 'orospu', 'piç', 'sik', 'göt', 'yarrak'];

client.once('ready', () => {
    console.log(`🛡️ Sunucu Koruma Sistemi Aktif: ${client.user.tag}`);
});

// Çökme Önleyici
process.on('unhandledRejection', (reason, p) => { console.error(reason); });
process.on('uncaughtException', (err, origin) => { console.error(err); });

client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || !message.guild) return;

        const mesajIcerikKucuk = message.content.toLowerCase();

        // ==========================================
        // 1. EVERYONE / HERE ETİKET KORUMASI
        // ==========================================
        if (message.content.includes('@everyone') || message.content.includes('@here')) {
            // Eğer mesajı atan kişi OWNER rolüne sahip DEĞİLSE veya FUTBOLCU rolüne sahipse
            const ownerMi = message.member.roles.cache.has(OWNER_ROL_ID);
            
            if (!ownerMi) {
                // Mesajı anında sil
                await message.delete().catch(() => {});

                // 5 Dakika Mute at (Timeout)
                const besDakika = 5 * 60 * 1000;
                await message.member.timeout(besDakika, 'Yetkisiz everyone/here etiketi kullanımı.').catch(() => {});

                // Kullanıcıya DM'den kaliteli uyarı gönder
                await message.author.send({
                    content: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ **SUNUCU CEZA UYARISI** ⚠️\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📢 **Sayın** <@${message.author.id}>,\n\nSunucumuzda yetkiniz olmadığı halde \`@everyone\` veya \`@here\` etiketini kullanmaya çalıştığınız tespit edilmiştir.\n\n⏳ **Uygulanan Ceza:** \`5 Dakika Susturma (Mute)\`\n\n👉 *Lütfen sunucu kurallarına riayet ediniz, aksi takdirde cezanız katlanacaktır.*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                }).catch(() => console.log('Kullanıcının DM kutusu kapalı, uyarı gitmedi.'));

                return; // Diğer korumalara bakmaya gerek yok, adam uçtu zaten
            }
        }

        // ==========================================
        // 2. DISCORD LINK ENGELLEYİCİ (Sadece Silme)
        // ==========================================
        if (mesajIcerikKucuk.includes('discord.gg/') || mesajIcerikKucuk.includes('discord.com/invite/')) {
            // Owner veya Yönetici değilse linkleri siler
            if (!message.member.roles.cache.has(OWNER_ROL_ID) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                await message.delete().catch(() => {});
                return;
            }
        }

        // ==========================================
        // 3. KÜFÜR ENGELLEYİCİ (Sadece Silme)
        // ==========================================
        const kufurVarMi = KUFUR_LISTESI.some(kufur => {
            // Kelime bazlı kontrol (örn: "aq" kelimesini yakalar ama "akvaryum"u silmez kanka)
            const regex = new RegExp(`\\b${kufur}\\b`, 'i');
            return regex.test(mesajIcerikKucuk);
        });

        if (kufurVarMi) {
            if (!message.member.roles.cache.has(OWNER_ROL_ID) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                await message.delete().catch(() => {});
                return;
            }
        }

    } catch (error) {
        console.error('Koruma sisteminde hata oluştu:', error);
    }
});

client.login(process.env.TOKEN);
