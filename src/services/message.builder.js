'use strict';

const { getLivesForToday, getTodayFormatted } = require('./supabase.service');

const GAME_EMOJIS = {
  'Blox Fruits': '🍎',
  'Roube um Egg': '🥚',
  'Roube um Ovo': '🥚',
  'Roblox': '🎮',
  'Descanso': '😴',
  'Especial': '⭐',
};

function getGameEmoji(game) {
  for (const [key, emoji] of Object.entries(GAME_EMOJIS)) {
    if (game && game.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '🎮';
}

const MORNING_PHRASES = [
  'Cada live que você faz é uma semente plantada. O público cresce porque você não para!',
  'Hoje é mais um dia de oportunidade. A galera vai estar lá — e você também vai!',
  'Consistência é o que separa quem sonha de quem conquista. Você tá no caminho certo!',
  'Não existe live ruim quando você aparece com energia e disposição. Bora começar forte!',
  'A sua presença já é inspiração e entretenimento pra muita gente. Apareça e faça acontecer!',
  'Cada hora dedicada na live é um investimento direto na sua comunidade e no seu futuro!',
  'A galera conta com você e espera sua gameplay. Prepara a mente, o café e vai com tudo!',
  'Um passo de cada vez, uma live de cada vez. Hoje você vai mostrar por que continua firme!',
  'O algoritmo ama disciplina, mas o público ama a sua energia autêntica. Brilha hoje!',
  'Grandes streamers foram construídos na repetição dos dias normais. Hoje é o dia de construir mais um tijolo!',
  'Quem tem meta não tem desculpa. Ajusta a postura na cadeira e prepara o show!',
  'Foco total no processo. A diversão do chat começa na sua animação de abrir a live!',
  'A persistência bate o talento quando o talento não é constante. Bora amassar mais um dia!',
  'Sua energia dita o ritmo da live. Acorde focado e entregue o seu melhor!',
  'Mais um dia pra quebrar recordes e interagir com quem torce pelo seu sucesso!'
];

const MORNING_TIPS = [
  '💡 *Dica do Dia:* Antes de abrir a live, cheque as atualizações do jogo para comentar com o chat.',
  '💡 *Dica do Dia:* Tome bastante água pela manhã para poupar a voz nas horas de transmissão.',
  '💡 *Dica do Dia:* Separe 5 minutos para divulgar o link nos seus stories ou status antes de iniciar.',
  '💡 *Dica do Dia:* Mantenha uma meta simples para hoje (ex: interagir com 3 inscritos novos no chat).',
  '💡 *Dica do Dia:* Teste o áudio do microfone e a iluminação antes do horário de abertura.',
  '💡 *Dica do Dia:* Faça um alongamento rápido de braços e costas para jogar com mais conforto.'
];

const AFTERNOON_PHRASES = [
  'Tá chegando a hora! Respira fundo, ajusta o setup e entra pra dominar!',
  'A live de hoje vai ser diferente — porque a sua energia vai estar no nível máximo!',
  'Faltam poucas horas pro show começar. Hidrata a garganta, se prepara e bora surpreender!',
  'Sem desculpa, sem enrolação. A hora da verdade tá perto e você tá mais do que pronto!',
  'O chat já deve estar contando os minutos. Vai lá e entrega aquilo que só você sabe fazer!',
  'Lives consistentes constroem comunidades fiéis. A sua tá crescendo a cada dia!',
  'Energia lá no topo! Confirma o stream key, OBS alinhado e vai quebrar tudo!',
  'Você já superou os dias difíceis. Mais uma live, mais momentos épicos registrados!',
  'Chegou a hora de transformar o cansaço em foco e diversão ao vivo!',
  'A gameplay de hoje promete! Dá aquele check no discord e chama todo mundo pra colar.',
  'A transmissão de hoje é a sua vitrine. Mostra a garra que você sempre teve!',
  'Não importa o cansaço do dia, quando a luz da live acende, você dá aula de carisma!',
  'Confia no treino e na sua habilidade. É hora de farmar views e respeito na live!',
  'O palco tá montado pra você brilhar. Prepara os atalhos e abre a live com tudo!'
];

const AFTERNOON_CHECKLIST = [
  '⚡ *Checklist Rápido:* OBS aberto? Microfone testado? Garrafa de água cheia? Título atualizado?',
  '⚡ *Checklist Rápido:* Conexão de rede estável? Stream key conferida? Bora abrir sem delay!',
  '⚡ *Checklist Rápido:* Alerta de doação/chat configurado? Iluminação ligada? Tudo pronto pro show!',
  '⚡ *Checklist Rápido:* Avisou a galera no grupo e discord? O público já tá a postos!'
];

function getRandomItem(pool) {
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

async function buildDailyMessage(period) {
  const lives = await getLivesForToday();
  const dateStr = getTodayFormatted();

  if (!lives || lives.length === 0) {
    const phrase = period === 'morning'
      ? getRandomItem(MORNING_PHRASES)
      : getRandomItem(AFTERNOON_PHRASES);

    if (period === 'morning') {
      return (
        `🌅 *Bom dia, Guerreiro!*\n\n` +
        `📅 *${dateStr}*\n\n` +
        `😴 Hoje na sua agenda é dia de *Descanso / Recarregar*.\n` +
        `Aproveita para organizar novas ideias, descansar a voz e renovar a mente!\n\n` +
        `💬 _"${phrase}"_\n\n` +
        `✨ _Tenha um excelente dia! Amanhã voltamos com tudo._`
      );
    } else {
      return (
        `🔔 *Lembrete da Tarde*\n\n` +
        `📅 *${dateStr}*\n\n` +
        `☕ Hoje não temos live programada na agenda. Bom momento para relaxar ou jogar algo off-stream!\n\n` +
        `💬 _"${phrase}"_\n\n` +
        `🔋 _Descanso também faz parte da evolução de um criador!_`
      );
    }
  }

  const gameMap = {};
  for (const live of lives) {
    if (!gameMap[live.game]) {
      gameMap[live.game] = { times: [], note: live.note || null };
    }
    gameMap[live.game].times.push(live.time);
  }

  const liveLines = Object.entries(gameMap).map(([game, info]) => {
    const emoji = getGameEmoji(game);
    const timeList = info.times.join(' e ');
    const noteStr = info.note ? `\n   ↳ 📌 _Obs: ${info.note}_` : '';
    return `${emoji} *${game}* ➔ ⏰ *${timeList}*${noteStr}`;
  }).join('\n\n');

  if (period === 'morning') {
    const phrase = getRandomItem(MORNING_PHRASES);
    const tip = getRandomItem(MORNING_TIPS);

    return (
      `🌅 *BOM DIA! HORA DE DOMINAR O DIA!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 *${dateStr}*\n\n` +
      `🎯 *SUA PROGRAMAÇÃO DE HOJE:*\n\n` +
      `${liveLines}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${tip}\n\n` +
      `💪 _"${phrase}"_\n\n` +
      `🚀 *Prepara o mindset e vamos fazer uma live épica!*`
    );
  } else {
    const phrase = getRandomItem(AFTERNOON_PHRASES);
    const check = getRandomItem(AFTERNOON_CHECKLIST);

    return (
      `🔔 *ATENÇÃO: SUA LIVE ESTÁ CHEGANDO!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 *${dateStr}*\n\n` +
      `⏳ Faltam poucas horas pro início da transmissão:\n\n` +
      `${liveLines}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${check}\n\n` +
      `🔥 _"${phrase}"_\n\n` +
      `👊 *Hora do show! Arrebenta na gameplay e contagia o chat!* 🚀`
    );
  }
}

module.exports = { buildDailyMessage };
