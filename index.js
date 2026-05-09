require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    Events,
    SlashCommandBuilder,
    REST,
    Routes
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

const CANAL_SOLICITAR = "1500287147348066375";
const CANAL_SOLICITACOES = "1502645095386710117";

const CARGOS = {
    "Polícia Militar": "1500290077220274196",
    "Força Tática": "1500290077773795368",

    "Soldado 2ª Classe": "1494576088427270184",
    "Soldado 1ª Classe": "1494584003938746368",
    "Cabo": "1494576517701832765",
    "3º Sargento": "1494577296227438692",
    "2º Sargento": "1494577657696747560",
    "1º Sargento": "1494577977395118190",
    "Sub Tenente": "1494578329741688862",
    "Aspirante": "1500297293767905341",
    "2º Tenente": "1494579024964485200",
    "1º Tenente": "1494580892092338266",
    "Capitão": "1494581839455846511"
};

const CARGOS_APROVACAO = [
    "1500288397355388958",
    "1500290078226780240",
    "1500258787574157332",
    "1494581513717813400",
    "1500297293767905341",
    "1494579024964485200",
    "1494580892092338266",
    "1494581839455846511"
];

const commands = [
    new SlashCommandBuilder()
        .setName("painel")
        .setDescription("Enviar painel de setagem")
        .addSubcommand(sub =>
            sub
                .setName("enviar")
                .setDescription("Enviar o painel")
        ),

    new SlashCommandBuilder()
        .setName("msg")
        .setDescription("Enviar mensagem oficial")
        .addStringOption(option =>
            option
                .setName("tipo")
                .setDescription("Tipo da mensagem")
                .setRequired(true)
                .addChoices(
                    {
                        name: "Embed",
                        value: "embed"
                    },
                    {
                        name: "Normal",
                        value: "normal"
                    }
                )
        )

].map(command => command.toJSON());

let dadosTemp = {};

client.once("ready", async () => {

    console.log(`✅ Bot online como ${client.user.tag}`);

    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    try {

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        console.log("✅ Slash Commands registrados.");

    } catch (error) {
        console.log(error);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {

    // ==================================================
    // SLASH COMMANDS
    // ==================================================
    if (interaction.isChatInputCommand()) {

        // /painel enviar
        if (
            interaction.commandName === "painel" &&
            interaction.options.getSubcommand() === "enviar"
        ) {

            const embed = new EmbedBuilder()
                .setTitle("Solicitação de Setagem")
                .setDescription(
                    `Clique no botão abaixo para solicitar sua setagem.\n\n` +
                    `Preencha corretamente todas as informações.`
                )
                .setColor("Blue");

            const botao = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("abrir_modal")
                    .setLabel("Solicitar Setagem")
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.channel.send({
                embeds: [embed],
                components: [botao]
            });

            return interaction.reply({
                content: "✅ Painel enviado.",
                ephemeral: true
            });
        }

        // /msg
        if (interaction.commandName === "msg") {

            const tipo =
                interaction.options.getString("tipo");

            const modal = new ModalBuilder()
                .setCustomId(`modal_msg_${tipo}`)
                .setTitle("Enviar Mensagem");

            const titulo = new TextInputBuilder()
                .setCustomId("titulo")
                .setLabel("Título")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const mensagem = new TextInputBuilder()
                .setCustomId("mensagem")
                .setLabel("Mensagem")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titulo),
                new ActionRowBuilder().addComponents(mensagem)
            );

            return await interaction.showModal(modal);
        }
    }

    // ==================================================
    // BOTÕES
    // ==================================================
    if (interaction.isButton()) {

        // ABRIR MODAL
        if (interaction.customId === "abrir_modal") {

            const modal = new ModalBuilder()
                .setCustomId("modal_setagem")
                .setTitle("Solicitação de Setagem");

            const nome = new TextInputBuilder()
                .setCustomId("nome")
                .setLabel("Nome")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const passaporte = new TextInputBuilder()
                .setCustomId("passaporte")
                .setLabel("Passaporte")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nome),
                new ActionRowBuilder().addComponents(passaporte)
            );

            return await interaction.showModal(modal);
        }

        // ==================================================
        // APROVAR
        // ==================================================
        if (interaction.customId.startsWith("aprovar_")) {

            const membroId = interaction.customId.split("_")[1];

            const autorizado = interaction.member.roles.cache.some(r =>
                CARGOS_APROVACAO.includes(r.id)
            );

            if (!autorizado) {
                return interaction.reply({
                    content: "❌ Você não possui permissão.",
                    ephemeral: true
                });
            }

            const dados = dadosTemp[membroId];

            if (!dados) {
                return interaction.reply({
                    content: "❌ Dados não encontrados.",
                    ephemeral: true
                });
            }

            const membro = await interaction.guild.members.fetch(membroId);

await membro.roles.add([
    CARGOS[dados.corporacao],
    CARGOS[dados.patente]
]);

// ==================================================
// ALTERAR APELIDO
// ==================================================

const abreviacoes = {
    "Soldado 2ª Classe": "SD²",
    "Soldado 1ª Classe": "SD",
    "Cabo": "CB",
    "3º Sargento": "3ºSgt",
    "2º Sargento": "2ºSgt",
    "1º Sargento": "1ºSgt",
    "Sub Tenente": "STen",
    "Aspirante": "Asp",
    "2º Tenente": "2ºTen",
    "1º Tenente": "1ºTen",
    "Capitão": "Cap"
};

const prefixo =
    dados.corporacao === "Força Tática"
        ? "[FT]"
        : "[PMESP]";

const abreviacaoPatente =
    abreviacoes[dados.patente];

const novoNick =
`${prefixo} ${abreviacaoPatente} ${dados.nome} | ${dados.passaporte}`;

await membro.setNickname(novoNick).catch(() => {});

            const embedAprovado = new EmbedBuilder()
                .setTitle("✅ Solicitação Aprovada")
                .setColor("Green")
                .addFields(
                    {
                        name: "Nome",
                        value: dados.nome,
                        inline: true
                    },
                    {
                        name: "Passaporte",
                        value: dados.passaporte,
                        inline: true
                    },
                    {
                        name: "Corporação",
                        value: dados.corporacao,
                        inline: true
                    },
                    {
                        name: "Patente",
                        value: dados.patente,
                        inline: true
                    },
                    {
                        name: "Quem Aprovou",
                        value: `${interaction.user}`,
                        inline: true
                    }
                );

            await interaction.update({
                embeds: [embedAprovado],
                components: []
            });

            membro.send(
                `✅ Sua solicitação foi aprovada!\n\n` +
                `Corporação: ${dados.corporacao}\n` +
                `Patente: ${dados.patente}`
            ).catch(() => {});
        }

        // ==================================================
        // REPROVAR
        // ==================================================
        if (interaction.customId.startsWith("reprovar_")) {

            const membroId = interaction.customId.split("_")[1];

            const autorizado = interaction.member.roles.cache.some(r =>
                CARGOS_APROVACAO.includes(r.id)
            );

            if (!autorizado) {
                return interaction.reply({
                    content: "❌ Você não possui permissão.",
                    ephemeral: true
                });
            }

            const dados = dadosTemp[membroId];

            if (!dados) {
                return interaction.reply({
                    content: "❌ Dados não encontrados.",
                    ephemeral: true
                });
            }

            const embedReprovado = new EmbedBuilder()
                .setTitle("❌ Solicitação Reprovada")
                .setColor("Red")
                .addFields(
                    {
                        name: "Nome",
                        value: dados.nome,
                        inline: true
                    },
                    {
                        name: "Passaporte",
                        value: dados.passaporte,
                        inline: true
                    },
                    {
                        name: "Corporação",
                        value: dados.corporacao,
                        inline: true
                    },
                    {
                        name: "Patente",
                        value: dados.patente,
                        inline: true
                    },
                    {
                        name: "Quem Reprovou",
                        value: `${interaction.user}`,
                        inline: true
                    }
                );

            await interaction.update({
                embeds: [embedReprovado],
                components: []
            });

            const membro = await interaction.guild.members.fetch(membroId);

            membro.send(
                `❌ Sua solicitação de setagem foi reprovada.`
            ).catch(() => {});
        }
    }

    // ==================================================
    // MODAL
    // ==================================================
    if (interaction.isModalSubmit()) {

        // MODAL SETAGEM
        if (interaction.customId === "modal_setagem") {

            const nome = interaction.fields.getTextInputValue("nome");
            const passaporte = interaction.fields.getTextInputValue("passaporte");

            dadosTemp[interaction.user.id] = {
                nome,
                passaporte
            };

            const corporacaoMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("select_corporacao")
                    .setPlaceholder("Selecione a Corporação")
                    .addOptions([
                        {
                            label: "Polícia Militar",
                            value: "Polícia Militar"
                        },
                        {
                            label: "Força Tática",
                            value: "Força Tática"
                        }
                    ])
            );

            return await interaction.reply({
                content: "Selecione a corporação:",
                components: [corporacaoMenu],
                ephemeral: true
            });
        }

        // MODAL MSG
        if (interaction.customId.startsWith("modal_msg_")) {

            const tipo =
                interaction.customId.split("_")[2];

            const titulo =
                interaction.fields.getTextInputValue("titulo");

            const mensagem =
                interaction.fields.getTextInputValue("mensagem");

            const cargoPM = `<@&${CARGOS["Polícia Militar"]}>`;
            const cargoFT = `<@&${CARGOS["Força Tática"]}>`;

            // EMBED
            if (tipo === "embed") {

                const embed = new EmbedBuilder()
                    .setTitle(titulo)
                    .setDescription(mensagem)
                    .setColor("Blue");

                await interaction.channel.send({
                    content: `${cargoPM} ${cargoFT}`,
                    embeds: [embed]
                });
            }

            // NORMAL
            if (tipo === "normal") {

                await interaction.channel.send({
                    content:
`${cargoPM} ${cargoFT}

# ${titulo.toUpperCase()}

${mensagem}`
                });
            }

            return interaction.reply({
                content: "✅ Mensagem enviada.",
                ephemeral: true
            });
        }
    }

    // ==================================================
    // SELECT MENU
    // ==================================================
    if (interaction.isStringSelectMenu()) {

        // CORPORAÇÃO
        if (interaction.customId === "select_corporacao") {

            dadosTemp[interaction.user.id].corporacao =
                interaction.values[0];

            const patenteMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("select_patente")
                    .setPlaceholder("Selecione a Patente")
                    .addOptions([
                        { label: "Soldado 2ª Classe", value: "Soldado 2ª Classe" },
                        { label: "Soldado 1ª Classe", value: "Soldado 1ª Classe" },
                        { label: "Cabo", value: "Cabo" },
                        { label: "3º Sargento", value: "3º Sargento" },
                        { label: "2º Sargento", value: "2º Sargento" },
                        { label: "1º Sargento", value: "1º Sargento" },
                        { label: "Sub Tenente", value: "Sub Tenente" },
                        { label: "Aspirante", value: "Aspirante" },
                        { label: "2º Tenente", value: "2º Tenente" },
                        { label: "1º Tenente", value: "1º Tenente" },
                        { label: "Capitão", value: "Capitão" }
                    ])
            );

            return await interaction.update({
                content: "Selecione a patente:",
                components: [patenteMenu]
            });
        }

        // PATENTE
        if (interaction.customId === "select_patente") {

            dadosTemp[interaction.user.id].patente =
                interaction.values[0];

            const dados = dadosTemp[interaction.user.id];

            const canal = await client.channels.fetch(CANAL_SOLICITACOES);

            const embed = new EmbedBuilder()
                .setTitle("Nova Solicitação de Setagem")
                .setColor("Yellow")
                .addFields(
                    {
                        name: "Nome",
                        value: dados.nome,
                        inline: true
                    },
                    {
                        name: "Passaporte",
                        value: dados.passaporte,
                        inline: true
                    },
                    {
                        name: "Corporação",
                        value: dados.corporacao,
                        inline: true
                    },
                    {
                        name: "Patente",
                        value: dados.patente,
                        inline: true
                    }
                );

            const botoes = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`aprovar_${interaction.user.id}`)
                    .setLabel("Aprovar")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId(`reprovar_${interaction.user.id}`)
                    .setLabel("Reprovar")
                    .setStyle(ButtonStyle.Danger)
            );

            const cargoMencao = `<@&${CARGOS[dados.corporacao]}>`;

            await canal.send({
                content: cargoMencao,
                embeds: [embed],
                components: [botoes]
            });

            await interaction.update({
                content: "✅ Solicitação enviada com sucesso!",
                components: []
            });
        }
    }
});

client.login(process.env.TOKEN);