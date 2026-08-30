const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ID Tanımlamaları
const KAYIT_KANAL_ID = '1542874216657850489';
const KAYIT_YETKILI_ROL_ID = '1542874729604579428';
const KAYITSIZ_ROL_ID = '1535308274482552914';
const KAYITLI_UYE_ROL_ID = '1535308273455202416'; // Otomatik eklenecek ortak rol

const ROLLER = {
    futbolcu: '1535308272293126214',
    td: '1535308267239116931',
    baskan: '1535308266169434222'
};

const ROL_ISIMLERI = {
    futbolcu: 'Futbolcu',
    td: 'Teknik Direktör',
    baskan: 'Kulüp Başkanı'
};

// Kayıt Verilerini Tutma (YetkiliID -> Sayı)
const kayitVerileri = {};

// 1. OTO HOŞ GELDİN KANALI & TAG
client.on('guildMemberAdd', async (member) => {
    const kanal = member.guild.channels.cache.get(KAYIT_KANAL_ID);
    if (!kanal) return;

    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`🎉 Aramıza Hoş Geldin, ${member.user.username}!`)
        .setDescription(`
✨ **Diamond League** sunucumuza ilk adımını attın!

👥 **Sunucu Durumu:** Seninle birlikte **${member.guild.memberCount}** kişi olduk!
⏳ **Kayıt İşlemi:** Yetkililerimiz en kısa sürede seninle ilgilenecektir.

🛡️ **Hesap Durumu:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R> oluşturulmuş
        `)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setImage('https://i.ibb.co/3s6D5fJ/car-snow.gif')
        .setFooter({ text: 'Diamond League • Otomatik Kayıt Sistemi', iconURL: member.guild.iconURL() })
        .setTimestamp();

    await kanal.send({ content: `<@&${KAYIT_YETKILI_ROL_ID}>`, embeds: [embed] });
});

// 2. MESAJ DİNLEYİCİ (.k VE .kayitsayilari)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();

    // A) .kayitsayilari / .ks KOMUTU
    if (content.startsWith('.kayitsayilari') || content.startsWith('.ks')) {
        if (!message.member.roles.cache.has(KAYIT_YETKILI_ROL_ID)) {
            return message.reply('❌ Bu komutu sadece **Kayıt Yetkilileri** kullanabilir!');
        }

        const yetkiliIdleri = Object.keys(kayitVerileri);

        if (yetkiliIdleri.length === 0) {
            return message.reply('📊 Henüz hiçbir yetkili kayıt yapmamış.');
        }

        const siralama = yetkiliIdleri
            .sort((a, b) => kayitVerileri[b] - kayitVerileri[a])
            .map((id, index) => {
                let madalya = '▫️';
                if (index === 0) madalya = '🥇';
                else if (index === 1) madalya = '🥈';
                else if (index === 2) madalya = '🥉';

                return `${madalya} **${index + 1}.** <@${id}> — \`${kayitVerileri[id]}\` Kayıt`;
            })
            .join('\n');

        const statEmbed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('🏆 Kayıt Sıralaması — Yetkili İstatistikleri')
            .setDescription(siralama)
            .setFooter({ text: 'Athena Lig Kayıt Sistemi', iconURL: message.guild.iconURL() })
            .setTimestamp();

        return message.channel.send({ embeds: [statEmbed] });
    }

    // B) .k KAYIT KOMUTU (.k @kullanıcı İsim)
    if (content.startsWith('.k')) {
        if (!message.member.roles.cache.has(KAYIT_YETKILI_ROL_ID)) {
            return message.reply('❌ Bu komutu sadece **Kayıt Yetkilileri** kullanabilir!');
        }

        const args = message.content.slice(2).trim().split(/ +/);
        const hedefUye = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const yeniIsim = args.slice(1).join(' ');

        if (!hedefUye || !yeniIsim) {
            return message.reply('⚠️ **Hatalı Kullanım!** Doğru kullanım: `.k @kullanıcı Yeni İsim`');
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`kayit_futbolcu_${hedefUye.id}_${yeniIsim}`)
                .setLabel('Futbolcu')
                .setStyle(ButtonStyle.Success)
                .setEmoji('⚽'),
            new ButtonBuilder()
                .setCustomId(`kayit_td_${hedefUye.id}_${yeniIsim}`)
                .setLabel('Teknik Direktör')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🧠'),
            new ButtonBuilder()
                .setCustomId(`kayit_baskan_${hedefUye.id}_${yeniIsim}`)
                .setLabel('Kulüp Başkanı')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('👑')
        );

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: 'Athena Lig — Kayıt Paneli', iconURL: message.guild.iconURL() })
            .setTitle('📋 Kullanıcı Kayıt Paneli')
            .setDescription(`
👤 **Kayıt Edilecek:** ${hedefUye} (\`${hedefUye.user.tag}\`)
✍️ **Verilecek İsim:** \`${yeniIsim}\`

📌 *Seçilen role göre otomatik olarak <@&${KAYITLI_UYE_ROL_ID}> rolü de eklenecektir.*

👇 *Lütfen ana rolü seçin:*
            `)
            .setThumbnail(hedefUye.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `İşlemi Başlatan Yetkili: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// 3. BUTON ETKİLEŞİMİ (2 Rol Verme + Kayıtsız Rolü Alımı)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [aksiyon, rolTuru, hedefId, ...isimParcalari] = interaction.customId.split('_');
    if (aksiyon !== 'kayit') return;

    if (!interaction.member.roles.cache.has(KAYIT_YETKILI_ROL_ID)) {
        return interaction.reply({ content: '❌ Bu butonla sadece Kayıt Yetkilileri etkileşime girebilir.', ephemeral: true });
    }

    const hedefUye = await interaction.guild.members.fetch(hedefId).catch(() => null);
    const yeniIsim = isimParcalari.join(' ');

    if (!hedefUye) {
        return interaction.reply({ content: '❌ Kayıt edilmek istenen kullanıcı sunucudan ayrılmış!', ephemeral: true });
    }

    const verilecekAnaRolId = ROLLER[rolTuru];

    try {
        // 1. İsim Değiştirme
        await hedefUye.setNickname(yeniIsim);

        // 2. Çift Rol Verimi (Ana Rol + Kayıtlı Üye Rolü)
        await hedefUye.roles.add([verilecekAnaRolId, KAYITLI_UYE_ROL_ID]);

        // 3. Kayıtsız Üye Rolünü Alma
        if (hedefUye.roles.cache.has(KAYITSIZ_ROL_ID)) {
            await hedefUye.roles.remove(KAYITSIZ_ROL_ID);
        }

        // 4. Yetkili Kayıt Sayısını Artır
        const yetkiliId = interaction.user.id;
        kayitVerileri[yetkiliId] = (kayitVerileri[yetkiliId] || 0) + 1;

        // 5. Şık Onay Embed'i
        const basariEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setAuthor({ name: 'Athena Lig — Kayıt Tamamlandı', iconURL: interaction.guild.iconURL() })
            .setTitle('⚡ Kayıt İşlemi Başarılı!')
            .setDescription(`
👤 **Kayıt Yapılan:** ${hedefUye} (\`${hedefUye.user.tag}\`)
✍️ **Yeni İsim:** \`${yeniIsim}\`

🎖️ **Verilen Roller:**
> • <@&${verilecekAnaRolId}> (${ROL_ISIMLERI[rolTuru]})
> • <@&${KAYITLI_UYE_ROL_ID}> (Kayıtlı Üye)

🗑️ **Alınan Rol:** <@&${KAYITSIZ_ROL_ID}>
📊 **Yetkili Toplam Kaydı:** \`${kayitVerileri[yetkiliId]}\`
            `)
            .setThumbnail(hedefUye.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Onaylayan Yetkili: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.update({
            embeds: [basariEmbed],
            components: []
        });

    } catch (err) {
        console.error(err);
        await interaction.reply({ 
            content: '❌ **Yetki Hatası!** Botun kendi rolü sunucu ayarlarında verilecek rollerin ve yetkililerin **üstünde** olmalıdır.', 
            ephemeral: true 
        });
    }
});

client.login(process.env.TOKEN);

