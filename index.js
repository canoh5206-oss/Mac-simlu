const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

const SUNUCU_ID = '1511859511634301059'; 
const YETKILI_ROL_ID = '1512316879551860796';
const BILGI_KANAL_ID = '1515123600502427739'; 

const ROL_MAP = {
    'futbolcu': '1512130383070892094',
    'baskan': '1512323399467139213',
    'td': '1513270136176381953'
};

let kayitSayilari = {};

client.once('ready', () => {
    console.log(`✅ Sistem Aktif, Hatalar Giderildi: ${client.user.tag}`);
});

// Çökme Önleyiciler (Kırmızı hata verip botun kapanmasını engeller kanka)
process.on('unhandledRejection', (reason, p) => { console.error(reason); });
process.on('uncaughtException', (err, origin) => { console.error(err); });

client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;

        // --- !k KOMUTU (Orijinal Yapın) ---
        if (message.content.startsWith('!k')) {
            if (!message.member.roles.cache.has(YETKILI_ROL_ID)) {
                return message.reply('❌ **Hata:** Kayıt yapma yetkin yok kanka!');
            }

            const hedonUye = message.mentions.members.first();
            if (!hedonUye) return message.reply('❌ Kullanıcıyı etiketle kanka!');

            const metinKismi = message.content.substring(message.content.indexOf('>') + 1).trim();
            const parcalar = metinKismi.split('|').map(p => p.trim());
            if (parcalar.length < 4) return message.reply('❌ Format: `!k @user isim | mevki | bayrak | değer`');

            const yeniTakmaAd = `${parcalar[0]} | ${parcalar[1].toUpperCase()} | ${parcalar[2]} | ${parcalar[3]}`;

            try {
                await hedonUye.setNickname(yeniTakmaAd);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`rol_futbolcu_${hedonUye.id}`).setLabel('⚽ Futbolcu').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`rol_baskan_${hedonUye.id}`).setLabel('👑 Başkan').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`rol_td_${hedonUye.id}`).setLabel('📋 TD').setStyle(ButtonStyle.Danger)
                );

                const embed = new EmbedBuilder()
                    .setTitle('📝 Kayıt Başarılı')
                    .setDescription(`👤 **Üye:** ${hedonUye}\n🏷️ **Takma Ad:** \`${yeniTakmaAd}\`\n\n👇 **Rol seçimi:**`)
                    .setColor(0x00FF00);

                await message.reply({ embeds: [embed], components: [row] });
                kayitSayilari[message.author.id] = (kayitSayilari[message.author.id] || 0) + 1;
            } catch (e) {
                message.reply('❌ Bot yetkilerini kontrol et kanka!');
            }
        }

        // --- .dm TRANSFER TEKLİF KOMUTU ---
        if (message.content.startsWith('.dm')) {
            if (!message.member.roles.cache.has(YETKILI_ROL_ID)) {
                return message.reply('❌ **Hata:** Bu komutu kullanmaya yetkin yok kanka!');
            }

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ **Hata:** Teklif gönderilecek oyuncuyu etiketle kanka! Örn: `.dm @Oyuncu Real Madrid...`');

            // Hata çıkaran metin ayıklama kısmını tamamen güvenli hale getirdik kanka
            const komutParcalari = message.content.split(' ');
            komutParcalari.shift(); // .dm kısmını siler
            komutParcalari.shift(); // @Etiket kısmını siler
            const teklifIcerik = komutParcalari.join(' ').trim();

            if (!teklifIcerik) return message.reply('❌ **Hata:** Teklif detaylarını yazmadın kanka!');

            try {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`teklif_evet_${hedefUye.id}`).setLabel('✅ Evet (Kabul Et)').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`teklif_hayir_${hedefUye.id}`).setLabel('❌ Hayır (Reddet)').setStyle(ButtonStyle.Danger)
                );

                await hedefUye.send({
                    content: `🚨 **YENİ TRANSFER TEKLİFİ GELDİ KANKA!**\n\n📋 **Teklif Detayları:**\n${teklifIcerik}\n\n👇 **Teklifi kabul ediyor musun?**`,
                    components: [row]
                });

                const bilgiKanali = client.channels.cache.get(BILGI_KANAL_ID) || await client.channels.fetch(BILGI_KANAL_ID).catch(() => null);
                if (bilgiKanali) {
                    await bilgiKanali.send({ 
                        content: `📩 **Teklif gönderdi**\n👤 **Oyuncu:** <@${hedefUye.id}>\n📝 **Detaylar:** ${teklifIcerik}`,
                        allowedMentions: { users: [] }
                    }).catch(() => {});
                }

                return message.reply(`✅ **Başarılı:** Teklif ${hedefUye.displayName} kullanıcısının DM kutusuna gönderildi ve loglandı!`);
            } catch (error) {
                return message.reply('❌ **Hata:** Oyuncunun DM kutusu kapalı olduğu için teklif iletilemedi kanka!');
            }
        }

        // --- .ara KOMUTU (Orijinal Yapın) ---
        if (message.content.startsWith('.ara')) {
            let aranan = message.content.replace('.ara', '').trim();
            if (!aranan) return message.reply('❌ **Hata:** Bir isim, mevki veya bayrak gir kanka. Örn: `.ara fransa`');

            const guild = client.guilds.cache.get(SUNUCU_ID) || message.guild;
            try { await guild.members.fetch(); } catch (fErr) { console.error("Üyeler çekilemedi:", fErr); }
            
            const arananKucuk = aranan.toLowerCase().toLocaleLowerCase('tr-TR');
            const fransaKelimeleri = ['fransa', 'fransız', 'fransiz', 'fr', 'fra', '🇲🇫', '🇫🇷'];
            const fransaAraniyorMu = fransaKelimeleri.includes(arananKucuk);

            const sonuclar = guild.members.cache.filter(m => {
                const nick = m.nickname ? m.nickname.toLowerCase().toLocaleLowerCase('tr-TR') : '';
                const username = m.user.username.toLowerCase().toLocaleLowerCase('tr-TR');
                
                if (fransaAraniyorMu) {
                    return nick.includes('🇲🇫') || nick.includes('🇫🇷') || nick.includes('fransa') || nick.includes('fransiz') ||
                           username.includes('fransa') || username.includes('fransiz');
                }
                return nick.includes(arananKucuk) || username.includes(arananKucuk) || (m.nickname && m.nickname.includes(aranan));
            });

            if (sonuclar.size === 0) return message.reply(`🔍 Aradığın kriterde (${aranan}) kimseyi bulamadım kanka.`);

            const liste = sonuclar.map(m => `👤 **${m.displayName}** - <@${m.user.id}>`).slice(0, 20).join('\n');
            
            return message.reply({
                content: `🔍 **Arama Sonuçları: "${aranan}"**\n\n${liste}\n\n📊 **${sonuclar.size} kişi bulundu.**`,
                allowedMentions: { users: [] }
            });
        }
    } catch (mainErr) { console.error(mainErr); }
});

// --- INTERACTION İŞLEYİCİ (Buton İşlemleri) ---
client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isButton()) return;
        
        const [prefix, secenek, userId] = interaction.customId.split('_');
        const bilgiKanali = client.channels.cache.get(BILGI_KANAL_ID) || await client.channels.fetch(BILGI_KANAL_ID).catch(() => null);

        // Hata fırlatan DM Buton alanını tamamen güvenli ve stabil hale getirdik kanka
        if (prefix === 'teklif') {
            await interaction.deferUpdate().catch(() => {}); // Kırmızı hatayı önleyen kritik satır
            await interaction.editReply({ components: [] }).catch(() => {});

            if (secenek === 'evet') {
                if (bilgiKanali) {
                    await bilgiKanali.send({ 
                        content: `🤝 **Teklif kabul etti**\n👤 **Oyuncu:** <@${userId}> gelen transfer teklifini kabul etti!`,
                        allowedMentions: { users: [] }
                    }).catch(() => {});
                }
                return;
            } 
            
            if (secenek === 'hayir') {
                if (bilgiKanali) {
                    await bilgiKanali.send({ 
                        content: `❌ **Teklifi reddetti**\n👤 **Oyuncu:** <@${userId}> gelen transfer teklifini reddetti!`,
                        allowedMentions: { users: [] }
                    }).catch(() => {});
                }
                return;
            }
        }

        // Orijinal Kayıt Rol Butonları Yapın (Hiç Dokunulmadı)
        if (prefix !== 'rol') return;

        const member = await interaction.guild.members.fetch(userId);
        if (!member) return interaction.reply({ content: '❌ Kullanıcı bulunamadı!', ephemeral: true });

        await member.roles.add(ROL_MAP[secenek]);
        const toplamKayit = kayitSayilari[interaction.user.id] || 0;
        
        return interaction.reply({ 
            content: `✅ **${member.displayName}** kullanıcısına rol verildi!\n📈 **Toplam Kayıt Sayın:** \`${toplamKayit}\`` 
        });
    } catch (e) { console.error(e); }
});

client.login(process.env.TOKEN);
        
