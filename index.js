const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

// Bot hazır olduğunda konsola yazdır
client.once('ready', () => {
    console.log(`🤖 Kanal kurulum botu aktif kanka! Giriş yapılan hesap: ${client.user.tag}`);
});

// Hata önleyiciler
process.on('unhandledRejection', (reason, p) => { console.error(reason); });
process.on('uncaughtException', (err, origin) => { console.error(err); });

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Kurulumu başlatacak komut kanka
    if (message.content === '-kur') {
        // Komutu kullanan kişinin yönetici olup olmadığını kontrol et
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Kanka bu komutu kullanmak için `Yönetici` yetkin olması gerekiyor!');
        }

        const bildiriMesaji = await message.reply('⏳ **Karagör Sunucu Yapısı Kuruluyor...** Lütfen kanallar oluşturulurken bekleyin kanka.');

        try {
            const guild = message.guild;

            // ------------------------------------------------------------
            // YARDIMCI FONKSİYON: Kategori ve alt kanallarını hızlıca açar
            // ------------------------------------------------------------
            async function kategoriVeKanallariOlustur(kategoriAdi, kanallar) {
                const kategori = await guild.channels.create({
                    name: kategoriAdi,
                    type: ChannelType.GuildCategory
                });

                for (const kanal of kanallar) {
                    await guild.channels.create({
                        name: kanal.name,
                        type: kanal.type,
                        parent: kategori.id
                    });
                }
            }

            // 1. Yetkili kanali (karagore)
            await kategoriVeKanallariOlustur('Yetkili kanali (karagore)', [
                { name: '・Sohbet', type: ChannelType.GuildText },
                { name: '・Duyuru', type: ChannelType.GuildText },
                { name: '・Bot komut', type: ChannelType.GuildText },
                { name: '・Toplanti ses', type: ChannelType.GuildVoice },
                { name: '・Toplanti saati', type: ChannelType.GuildText }
            ]);

            // 2. Reality League (karagore)
            await kategoriVeKanallariOlustur('Reality League (karagore)', [
                { name: '🎪・takımlar', type: ChannelType.GuildText },
                { name: '・Kayıt odasi', type: ChannelType.GuildText },
                { name: '・Rol-al', type: ChannelType.GuildText }
            ]);

            // 3. Bilgilendirme (karagore)
            await kategoriVeKanallariOlustur('Bilgilendirme (karagore)', [
                { name: '📣・duyuru', type: ChannelType.GuildText },
                { name: '📦・sistemler', type: ChannelType.GuildText },
                { name: '📚・kurallar', type: ChannelType.GuildText },
                { name: '💎・anılar', type: ChannelType.GuildText },
                { name: '🎭・rol-bilgi', type: ChannelType.GuildText },
                { name: '🔮・rol-alma', type: ChannelType.GuildText },
                { name: '🚀・booster', type: ChannelType.GuildText },
                { name: '📈・seviye', type: ChannelType.GuildText },
                { name: '✨・yetkili-alım', type: ChannelType.GuildText },
                { name: '✨・spiker-alım', type: ChannelType.GuildText },
                { name: '🎙️・spiker-sonuçları', type: ChannelType.GuildText }
            ]);

            // 4. Diğer Kanallar (karagore)
            await kategoriVeKanallariOlustur('Diğer Kanallar (karagore)', [
                { name: '🔔・güncelleme', type: ChannelType.GuildText },
                { name: '🚀・booster-bilgi', type: ChannelType.GuildText },
                { name: '🛒・Market', type: ChannelType.GuildText },
                { name: '🗳️・oy ver', type: ChannelType.GuildText },
                { name: '🎫・Ticket', type: ChannelType.GuildText }
            ]);

            // 5. Genel
            await kategoriVeKanallariOlustur('Genel', [
                { name: '・Sohnet', type: ChannelType.GuildText },
                { name: '・Medya', type: ChannelType.GuildText },
                { name: '🤖・medya', type: ChannelType.GuildText },
                { name: '💡・istek-şikayet', type: ChannelType.GuildText }
            ]);

            // 6. Eğlence Kanalları (karagore)
            await kategoriVeKanallariOlustur('Eğlence Kanalları (karagore)', [
                { name: '💵・owo', type: ChannelType.GuildText },
                { name: '🏆・turnuva', type: ChannelType.GuildText },
                { name: '💫・bil-kazan', type: ChannelType.GuildText }
            ]);

            // 7. Antrenman (karagore)
            await kategoriVeKanallariOlustur('Antrenman (karagore)', [
                { name: '🎽・antrenman', type: ChannelType.GuildText },
                { name: '🥅・penaltı-antrenman', type: ChannelType.GuildText },
                { name: '🎽・antrenman-bilgi', type: ChannelType.GuildText }
            ]);

            // 8. Değer İsteme & Bütçe İsteme (karagore)
            await kategoriVeKanallariOlustur('Değer İsteme & Bütçe İsteme (karagore)', [
                { name: '📊・değer-bütçe-kasma', type: ChannelType.GuildText },
                { name: '💸・değer-bütçe-isteme', type: ChannelType.GuildText },
                { name: '🔍・değer-bütçe-bildiri', type: ChannelType.GuildText }
            ]);

            // 9. Sosyal Medya (karagore)
            await kategoriVeKanallariOlustur('Sosyal Medya (karagore)', [
                { name: '🌐・twitter', type: ChannelType.GuildText },
                { name: '📷・instagram', type: ChannelType.GuildText },
                { name: '🎵・tiktok', type: ChannelType.GuildText }
            ]);

            // 10. Efsane (karagore)
            await kategoriVeKanallariOlustur('Efsane (karagore)', [
                { name: '💰・en-değerli-futbolcular', type: ChannelType.GuildText },
                { name: '💰・en-değerli-takımlar', type: ChannelType.GuildText },
                { name: '🏛️・müze', type: ChannelType.GuildText },
                { name: '⭐・efsaneler', type: ChannelType.GuildText }
            ]);

            // 11. Efsane Lig (karagore)
            await kategoriVeKanallariOlustur('Efsane Lig (karagore)', [
                { name: '🏆・puan-durumu', type: ChannelType.GuildText },
                { name: '📅・fikstür', type: ChannelType.GuildText },
                { name: '📝・maç-sonuçları', type: ChannelType.GuildText },
                { name: '⚽・gol-krallığı', type: ChannelType.GuildText },
                { name: '⚽・asist-krallığı', type: ChannelType.GuildText },
                { name: '🏥・sakatlıklar', type: ChannelType.GuildText },
                { name: '🟥・cezalılar', type: ChannelType.GuildText },
                { name: '🥅・kadrolar', type: ChannelType.GuildText },
                { name: '👑・sezonun-oyuncusu', type: ChannelType.GuildText },
                { name: '👑・haftanın-oyuncusu', type: ChannelType.GuildText }
            ]);

            // 12. Efsane Cup (karagore)
            await kategoriVeKanallariOlustur('Efsane Cup (karagore)', [
                { name: '📅・fikstür', type: ChannelType.GuildText },
                { name: '📝・maç-sonuçları', type: ChannelType.GuildText },
                { name: '⚽・gol-krallığı', type: ChannelType.GuildText },
                { name: '⚽・asist-krallığı', type: ChannelType.GuildText },
                { name: '🟥・cezalılar', type: ChannelType.GuildText },
                { name: '🥅・kadrolar-cup', type: ChannelType.GuildText }
            ]);

            // 13. Efsane Süper Cup (karagore)
            await kategoriVeKanallariOlustur('Efsane Süper Cup (karagore)', [
                { name: '📅・fikstür', type: ChannelType.GuildText },
                { name: '🔍・maç-sonuçları', type: ChannelType.GuildText },
                { name: '👑・krallıklar', type: ChannelType.GuildText }
            ]);

            // 14. Maç Kanalları (karagore)
            await kategoriVeKanallariOlustur('Maç Kanalları (karagore)', [
                { name: '📺・bein-sports', type: ChannelType.GuildText },
                { name: '🏟️・bein-tribün', type: ChannelType.GuildText },
                { name: '📺・exxen-spor', type: ChannelType.GuildText },
                { name: '🏟️・exxen-tribün', type: ChannelType.GuildText }
            ]);

            // 15. Transfer (karagore)
            await kategoriVeKanallariOlustur('Transfer (karagore)', [
                { name: '🚧・transfer-kuralları', type: ChannelType.GuildText },
                { name: '✅・kap', type: ChannelType.GuildText },
                { name: '🔍・takım-arama', type: ChannelType.GuildText },
                { name: '💷・transfer-masası', type: ChannelType.GuildText },
                { name: '📋・kap-bilgi', type: ChannelType.GuildText }
            ]);

            await bildiriMesaji.edit('✅ **Başarılı!** İstediğin tüm Karagör kategorileri ve kanalları eksiksiz olarak kuruldu kanka!');

        } catch (error) {
            console.error(error);
            await bildiriMesaji.edit('❌ Kanal düzeni kurulurken bir hata oluştu kanka. Botun yetkilerini kontrol et!');
        }
    }
});

client.login(process.env.TOKEN);
                 
                        
                

          
                        
                
