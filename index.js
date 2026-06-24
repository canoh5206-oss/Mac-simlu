const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const takimlar = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const args = message.content.split(' ');

    // 1. DİZİLİŞ VE KADRO KURULUMU BUTONLU
    if (args[0] === '!kurulum') {
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('secim_mevki')
                .setPlaceholder('Mevki Seç...')
                .addOptions([
                    { label: 'GK', value: 'GK' },
                    { label: 'Stoper', value: 'Stoper' },
                    { label: 'Forvet', value: 'Forvet' }
                ]),
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_ilk11').setLabel('İlk 11').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_yedek').setLabel('Yedek').setStyle(ButtonStyle.Secondary)
        );

        message.reply({ content: "İşlemi seç:", components: [row, row2] });
    }
});

// BUTON VE MENÜ TIKLAMALARI (Burada veriyi alıp kaydediyoruz)
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

    // Basit bir geçici depolama (Kullanıcının o anki seçimini tutar)
    if (interaction.customId === 'secim_mevki') {
        interaction.reply({ content: `Seçildi: ${interaction.values[0]}`, ephemeral: true });
    }
    
    if (interaction.customId === 'btn_ilk11') {
        interaction.reply({ content: "Oyuncu İlk 11'e atandı!", ephemeral: true });
    }
});

client.login(process.env.TOKEN);
