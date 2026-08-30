
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

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

const ROLLER = {
    futbolcu: '1535308272293126214',
    td: '1535308267239116931',
    baskan: '1535308266169434222'
};

// 1. OTO HOŞ GELDİN KANALI & TAG
client.on('guildMemberAdd', async (member) => {
    const kanal = member.guild.channels.cache.get(KAYIT_KANAL_ID);
    if (!kanal) return;

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`Hoşgeldin ${member.user.username} 🐱`)
        .setDescription(`🐥 **Diamond League** adlı sunucumuza hoşgeldiniiizz!!\n\n👥 Seninle beraber tam olarak **${member.guild.memberCount}** kişi olduukkk\n\n🎲 Yetkililer seni birazdan kayıt edecektir. Lütfen biraz sabredin\n\nHesabın <t:${Math.floor(member.user.createdTimestamp / 1000)}:R> kurulmuş.\nHesap Güvenli 🛡️`)
        .setThumbnail(member.user.displayAvatarURL())
        .setImage('https://i.ibb.co/3s6D5fJ/car-snow.gif') // İsteğe bağlı banner/fotoğraf linki
        .setFooter({ text: `Nasılsın bakalım ${member.user.username}?` });

    await kanal.send({ content: `<@&${KAYIT_YETKILI_ROL_ID}>`, embeds: [embed] });
});

// 2. YETKİLİ KAYIT KOMUTU (!k @kullanıcı İsim)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!k')) return;

    // Yetkili Kontrolü
    if (!message.member.roles.cache.has(KAYIT_YETKILI_ROL_ID)) {
        return message.reply('❌ Bu komutu kullanmak için Kayıt Yetkilisi rolüne sahip olmalısın!');
    }

    const args = message.content.slice(2).trim().split(/ +/);
    const hedefUye = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const yeniIsim = args.slice(1).join(' ');

    if (!hedefUye || !yeniIsim) {
        return message.reply('⚠️ Hatalı kullanım! Örnek: `!k @kullanıcı Yeni İsim`');
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`kayit_futbolcu_${hedefUye.id}_${yeniIsim}`).setLabel('Futbolcu').setStyle(ButtonStyle.Primary).setEmoji('⚽'),
        new ButtonBuilder().setCustomId(`kayit_td_${hedefUye.id}_${yeniIsim}`).setLabel('Teknik Direktör').setStyle(ButtonStyle.Primary).setEmoji('🧠'),
        new ButtonBuilder().setCustomId(`kayit_baskan_${hedefUye.id}_${yeniIsim}`).setLabel('Kulüp Başkanı').setStyle(ButtonStyle.Primary).setEmoji('👑')
    );

    const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('⚽ Kayıt Menüsü')
        .setDescription(`**Kayıt Edilecek:** ${hedefUye}\n**Verilecek İsim:** \`${yeniIsim}\`\n\nLütfen verilecek rolü aşağıdan seçin:`);

    await message.channel.send({ embeds: [embed], components: [row] });
});

// 3. BUTON ETKİLEŞİMİ (Rol verme & İsim Değiştirme)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [aksiyon, rolTuru, hedefId, ...isimParcalari] = interaction.customId.split('_');
    if (aksiyon !== 'kayit') return;

    // İşlemi yapan yetkili mi?
    if (!interaction.member.roles.cache.has(KAYIT_YETKILI_ROL_ID)) {
        return interaction.reply({ content: '❌ Bu butonları sadece Kayıt Yetkilisi kullanabilir.', ephemeral: true });
    }

    const hedefUye = await interaction.guild.members.fetch(hedefId).catch(() => null);
    const yeniIsim = isimParcalari.join(' ');

    if (!hedefUye) {
        return interaction.reply({ content: '❌ Kullanıcı sunucuda bulunamadı!', ephemeral: true });
    }

    const verilecekRolId = ROLLER[rolTuru];

    try {
        // İsim Değiştirme
        await hedefUye.setNickname(yeniIsim);

        // Rol Ekleme & Kayıtsız Rolünü Alma
        await hedefUye.roles.add(verilecekRolId);
        if (hedefUye.roles.cache.has(KAYITSIZ_ROL_ID)) {
            await hedefUye.roles.remove(KAYITSIZ_ROL_ID);
        }

        await interaction.update({
            content: `✅ ${hedefUye} kullanıcısı **${yeniIsim}** ismiyle kayıt edildi ve <@&${verilecekRolId}> rolü verildi!`,
            embeds: [],
            components: []
        });

    } catch (err) {
        console.error(err);
        await interaction.reply({ content: '❌ Rol verirken veya isim değiştirirken yetki hatası oluştu! Botun rolünü en üste taşıyın.', ephemeral: true });
    }
});

client.login(process.env.TOKEN);

