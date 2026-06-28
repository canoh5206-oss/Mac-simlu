const { Client, GatewayIntentBits, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers
    ]
});

// Sabit IDs
const OWNER_ROL_ID = '1513269024866304091'; // Muaf 1. Rol (Owner)
const MUAF_ROL_ID = '1513269573451911259';  // Muaf 2. Rol
const KAYIT_YETKILI_ROL_ID = '1512316879551860796'; // Sadece bu rol kayıt yapabilir!
const KAYIT_ODASI_ID = '1512128053810303116'; // Sadece burada kayıt yapılacak!
const SOHBET_KANAL_ID = '1513271753491616064'; // Kayıt duyuru ve küfür uyarısı kanalı

// Kayıt Rol IDs
const ROL_FUTBOLCU = '1512130383070892094';
const ROL_BASKAN = '1512323399467139213';
const ROL_TD = '1513270136176381953';
const ROL_UYE = '1518721617612640346';

// Hafızada Kayıt Verilerini Tutma
let kayitVerileri = {}; 

// Engellenen kelimelerin tam listesi
const KUFUR_LISTESI = [
    'amk', 'aq', 'orospu', 'piç', 'sik', 'göt', 'yarrak',
    'prono', 'prona', 'prana', '31', '67', 'anani', 
    'oe', 'œ', 'oropusu', 'orobusu', 'oropusu çocugu'
];

client.once('ready', () => {
    console.log(`🛡️ Sistem Aktif (-k Komut Düzeni Aktif) kanka: ${client.user.tag}`);
});

// Çökme Önleyiciler
process.on('unhandledRejection', (reason, p) => { console.error(reason); });
process.on('uncaughtException', (err, origin) => { console.error(err); });

// ==========================================
// MESAJ İŞLEMLERİ (KORUMA VE KOMUTLAR)
// ==========================================
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || !message.guild) return;

        const mesajIcerikKucuk = message.content.toLowerCase().toLocaleLowerCase('tr-TR');
        const yetkiliMi = message.member.roles.cache.has(OWNER_ROL_ID) || message.member.roles.cache.has(MUAF_ROL_ID);
        const kayitYetkilisiMi = message.member.roles.cache.has(KAYIT_YETKILI_ROL_ID);

        // --- 1. KAYIT KOMUTLARI ---
        
        // -k Komutu Kontrolü
        if (message.content.startsWith('-k')) {
            // Kayıt odası dışındaysa hata mesajı gönder
            if (message.channel.id !== KAYIT_ODASI_ID) {
                const hataEmbed = new EmbedBuilder()
                    .setTitle('❌ HATA!')
                    .setDescription(`Komut, bu kanalda kullanılmaz. Lütfen seçili olan <#${KAYIT_ODASI_ID}> kanalında kullanın.`)
                    .setColor(0xFF0000) 
                    .setFooter({ text: `Nors | bugün saat ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` });
                
                return message.reply({ embeds: [hataEmbed] });
            }

            // Yetki kontrolü
            if (!kayitYetkilisiMi) return message.reply('❌ Kanka bu komutu kullanmak için <@&1512316879551860796> rolüne sahip olman gerekiyor!');

            const hedefUye = message.mentions.members.first();
            if (!hedefUye) return message.reply('❌ Kayıt edilecek üyeyi etiketle kanka! Örn: `-k @üye İsim | Mevki | Bayrak | Değer`');

            const metinKismi = message.content.substring(message.content.indexOf('>') + 1).trim();
            if (!metinKismi.includes('|')) return message.reply('❌ Lütfen formatı doğru gir kanka! Örn: `İsim | Mevki | Bayrak | Değer`');

            // İsmini düzenle
            await hedefUye.setNickname(metinKismi).catch(() => {});

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`kayit_futbolcu_${hedefUye.id}`).setLabel('⚽ Futbolcu').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`kayit_baskan_${hedefUye.id}`).setLabel('👑 Takım Başkanı').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`kayit_td_${hedefUye.id}`).setLabel('📋 Teknik Direktör').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`kayit_uye_${hedefUye.id}`).setLabel('👤 Üye').setStyle(ButtonStyle.Secondary)
            );

            return message.reply({
                content: `📝 <@${hedefUye.id}> kullanıcısının adı \`${metinKismi}\` olarak ayarlandı. Lütfen vermem gereken rolü aşağıdaki butonlardan seç kanka:`,
                components: [row]
            });
        }

        // -kayitsayi Komutu Kontrolü
        if (message.content.startsWith('-kayitsayi')) {
            const siraliListe = Object.entries(kayitVerileri)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            if (siraliListe.length === 0) return message.reply('📭 Henüz hiç kayıt yapılmamış kanka.');

            let descriptionMetni = 'En çok üye kaydedenler\n\n';
            siraliListe.forEach(([yetkiliId, sayi]) => {
                descriptionMetni += `<@${yetkiliId}>'ın toplam kayıt sayısı:\n${sayi}\n\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('📊 Kayıt Sıralaması!')
                .setDescription(descriptionMetni)
                .setColor(0x2F3136) 
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setFooter({ text: 'Nors Kayıt Sistemi' });

            return message.reply({ embeds: [embed] });
        }

        // --- 2. GÜVENLİK VE KORUMALAR ---
        if (!yetkiliMi) {
            if (message.content.includes('@everyone') || message.content.includes('@here') || mesajIcerikKucuk.includes('@herw')) {
                await message.delete().catch(() => {});
                await message.member.timeout(5 * 60 * 1000, 'Yetkisiz etiket kullanımı.').catch(() => {});
                await message.author.send({ content: `⚠️ Sunucuda yetkiniz olmadan etiket kullanmaya çalıştığınız için **5 dakika** susturuldunuz.` }).catch(() => {});
                return;
            }

            if (message.mentions.roles.size > 0) {
                await message.delete().catch(() => {});
                return;
            }

            if (mesajIcerikKucuk.includes('discord.gg/') || mesajIcerikKucuk.includes('discord.com/invite/')) {
                await message.delete().catch(() => {});
                return;
            }

            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                const kufurVarMi = KUFUR_LISTESI.some(kufur => {
                    const regex = new RegExp(`\\b${kufur}\\b`, 'i');
                    return regex.test(mesajIcerikKucuk);
                });

                if (kufurVarMi) {
                    await message.delete().catch(() => {});
                    await message.member.timeout(5 * 60 * 1000, 'Sohbette küfür kullanımı.').catch(() => {});

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
// BUTON ETKİLEŞİMLERİ (KAYIT TAMAMLAMA)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [prefix, secilenRol, hedefId] = interaction.customId.split('_');
    if (prefix !== 'kayit') return;

    try {
        const guild = interaction.guild;
        const hedefUye = await guild.members.fetch(hedefId).catch(() => null);
        if (!hedefUye) return interaction.reply({ content: '❌ Kullanıcı sunucuda bulunamadı kanka!', ephemeral: true });

        let verilecekRolId = '';
        let rolIsmi = '';

        if (secilenRol === 'futbolcu') { verilecekRolId = ROL_FUTBOLCU; rolIsmi = 'Futbolcu'; }
        else if (secilenRol === 'baskan') { verilecekRolId = ROL_BASKAN; rolIsmi = 'Takım Başkanı'; }
        else if (secilenRol === 'td') { verilecekRolId = ROL_TD; rolIsmi = 'Teknik Direktör'; }
        else if (secilenRol === 'uye') { verilecekRolId = ROL_UYE; rolIsmi = 'Üye'; }

        await hedefUye.roles.add(verilecekRolId).catch(() => {});

        kayitVerileri[interaction.user.id] = (kayitVerileri[interaction.user.id] || 0) + 1;

        await interaction.message.delete().catch(() => {});

        const sohbetKanali = guild.channels.cache.get(SOHBET_KANAL_ID) || await guild.channels.fetch(SOHBET_KANAL_ID).catch(() => null);
        if (sohbetKanali) {
            await sohbetKanali.send({ content: `📢 **<@${hedefUye.id}> aramıza katıldı.**` }).catch(() => {});

            const embed = new EmbedBuilder()
                .setTitle('✨ Kayıt Yapıldı!')
                .setDescription(`🤝 • <@${hedefUye.id}> aramıza **${rolIsmi}** rolleriyle katıldı.\n\n🌟 • **Kaydı gerçekleştiren yetkili:**\n<@${interaction.user.id}>\n\n🐼 • **Aramıza hoş geldin**\n<@${hedefUye.id}>`)
                .setColor(0x2F3136)
                .setThumbnail(hedefUye.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Nors Kayıt Sistemi' });

            await sohbetKanali.send({ embeds: [embed] }).catch(() => {});
        }

        return interaction.reply({ content: `✅ <@${hedefUye.id}> başarıyla kaydedildi ve **${rolIsmi}** rolü tanımlandı!`, ephemeral: true });

    } catch (err) {
        console.error(err);
        return interaction.reply({ content: '❌ İşlem sırasında bir hata meydana geldi kanka.', ephemeral: true });
    }
});

client.login(process.env.TOKEN);
                        
                

          
                        
                
