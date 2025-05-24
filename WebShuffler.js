const WebShuffler = {
  shuffle: (text, mode) => {
    const lines = text.split(/\r?\n/);
    const header = [];
    const measures = new Map();
    const targets = ["11", "12", "13", "14", "15", "18", "19"];
    const extraLines = [];
    let titleModified = false;

    for (const line of lines) {
      const m = line.match(/^#(\d{3})(\d{2}):(.*)$/);
      if (m) {
        const [_, bar, ch, data] = m;
        if (!targets.includes(ch)) {
          extraLines.push(line);
        } else {
          if (!measures.has(bar)) measures.set(bar, {});
          measures.get(bar)[ch] = data;
        }
      } else {
        if (line.startsWith("#TITLE") && !titleModified) {
          header.push(line + (mode === "S" ? " [S乱]" : " [H乱]"));
          titleModified = true;
        } else {
          header.push(line);
        }
      }
    }

    const result = [...header];
    let prevNoteChannelGlobal = null; // 小節をまたぐ連打回避用

    for (const [bar, chs] of measures.entries()) {
      const channelNotes = {};
      let maxLen = 0;
      for (const ch of targets) {
        const data = chs[ch] || "";
        const notes = data.match(/../g) || [];
        channelNotes[ch] = notes;
        maxLen = Math.max(maxLen, notes.length);
      }

      // 小節内は maxLen に合わせてリスケール
      for (const ch of targets) {
        const notes = channelNotes[ch];
        const rescaled = Array(maxLen).fill("00");
        for (let i = 0; i < notes.length; i++) {
          const idx = Math.floor(i * maxLen / notes.length);
          rescaled[idx] = notes[i];
        }
        channelNotes[ch] = rescaled;
      }

      const prevNoteChannel = Array(maxLen).fill(null); // 小節内の直前チャンネル

      for (let i = 0; i < maxLen; i++) {
        const activeNotes = [];
        for (const ch of targets) {
          if (channelNotes[ch][i] !== "00") {
            activeNotes.push(channelNotes[ch][i]);
            channelNotes[ch][i] = "00";
          }
        }

        if (activeNotes.length === 0) continue;

        if (mode === "S") {
          // S乱はそのままランダムシャッフル
          const shuffledChs = [...targets];
          shuffleArray(shuffledChs);
          const shuffledNotes = [...activeNotes];
          shuffleArray(shuffledNotes);
          for (let j = 0; j < shuffledNotes.length; j++) {
            channelNotes[shuffledChs[j]][i] = shuffledNotes[j];
          }
          prevNoteChannel[i] = shuffledChs[0]; // 適当にセット（連打回避目的ではない）
        } else if (mode === "H") {
          // H乱：連打回避しつつシャッフル、小節またぎも考慮
          const availableChs = [...targets];
          shuffleArray(availableChs);
          shuffleArray(activeNotes);

          const prevChAtTime = (i === 0) ? prevNoteChannelGlobal : prevNoteChannel[i - 1];
          const assignedChannels = new Set();

          for (const note of activeNotes) {
            let placed = false;

            // 直前時間チャンネルと同じチャンネルを避けつつ割り当て
            for (const ch of availableChs) {
              if (ch !== prevChAtTime && !assignedChannels.has(ch) && channelNotes[ch][i] === "00") {
                channelNotes[ch][i] = note;
                assignedChannels.add(ch);
                placed = true;
                break;
              }
            }

            // それでも割り当てられなければ制約緩和
            if (!placed) {
              for (const ch of availableChs) {
                if (!assignedChannels.has(ch) && channelNotes[ch][i] === "00") {
                  channelNotes[ch][i] = note;
                  assignedChannels.add(ch);
                  placed = true;
                  break;
                }
              }
            }

            // さらに割り当てできなければ重複も許容（ほぼ起きない想定）
            if (!placed) {
              for (const ch of availableChs) {
                if (channelNotes[ch][i] === "00") {
                  channelNotes[ch][i] = note;
                  assignedChannels.add(ch);
                  break;
                }
              }
            }
          }

          prevNoteChannel[i] = assignedChannels.values().next().value || null;
        }
      }

      // 小節終わりに最後のタイムのチャンネルをグローバルに保存（次小節で参照）
      prevNoteChannelGlobal = prevNoteChannel[maxLen - 1];

      for (const ch of targets) {
        result.push(`#${bar}${ch}:${channelNotes[ch].join("")}`);
      }
    }

    result.push(...extraLines);
    return result.join("\n");
  }
};

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
