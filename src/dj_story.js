// ===================== 東江 · the East River's choices =====================
// The decisions of the East River campaign (see choices.js for the panel and the ledger). Each one is written into the save
// (DS.ch, DS.ledger) and answered later: at the fire, in the cards, and in the ledger at the end.
// 一 · the millet (camp before the ford): the last of the file's millet, and the children of the column
CHD.dj2millet = {
  build: (C) => ({ id: 'dj2millet', title: '小米 · The millet', ltitle: 'The last of the millet', year: 'The night before the Ai river, 1621', who: ['鄭老 Old Zheng', 'with the sack in his lap'], hold: 1.2,
    lines: [chL('（鄭老把袋子倒過來抖了抖。剩下的小米，夠十個人吃兩天。）', '(Old Zheng turns the sack over and shakes it. What\'s left would feed ten people for two days.)'),
      chL('車那邊有個女人，帶著三個孩子。最小的那個，今天已經不哭了。', 'Over by the carts there\'s a woman with three children. The youngest stopped crying today.'),
      chL('劉黑子：明天站在河邊擋馬的是我們。餓著肚子，刀是飄的。', 'Liu Heizi: Tomorrow we\'re the ones standing on the bank in front of the horses. On an empty belly, your blade floats.'),
      chL('鄭老：你說。你是你爹的兒子。', 'Old Zheng: You say. You\'re your father\'s son.')],
    opts: [
      { q: 'Give it to the children.', led: 'Gave the file\'s last millet to the refugee children.', a: [chL('（那女人沒說謝。她只是一直點頭，點到你走開。）', '(The woman doesn\'t say thank you. She just keeps nodding until you walk away.)'), chL('劉黑子一晚上沒跟你說話。', 'Liu Heizi doesn\'t speak to you all night.')],
        fx: (C) => { chBond(C, 'zheng', 1); chBond(C, 'liu', -1); C.S.flags.milletGiven = 1; } },
      { q: 'Keep it for the men who hold the ford.', led: 'Kept the millet for the men who would hold the ford.', a: [chL('鄭老把袋口紮上，什麼也沒說。', 'Old Zheng ties the sack shut and says nothing.'), chL('（後半夜，車那邊有個女人哭了很久。）', '(Late in the night, over by the carts, a woman cries for a long time.)')],
        fx: (C) => { chBond(C, 'liu', 1); C.S.flags.milletKept = 1; } },
      { q: 'Half and half.', led: 'Split the millet: half for the children, half for the file.', a: [chL('鄭老：一半。一半也是一天。', 'Old Zheng: Half. Half is still a day.'), chL('（誰也不滿意。誰也沒說話。）', '(No one is satisfied. No one says so.)')],
        fx: (C) => { C.S.flags.milletHalf = 1; } },
    ],
    go: 'Lie down →' }),
  end: (C, o) => o === 0 ? (C.S.flags.childLived ? 'The youngest one lived.' : 'You never knew if the youngest one lived.') : o === 1 ? 'The file held the ford.' : 'Half a day, for everyone.',
};
