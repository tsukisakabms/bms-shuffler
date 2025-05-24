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

    for (const [bar, chs] of measures.entries()) {
      const channelNotes = {};
      let maxLen = 0;
      for (const ch of targets) {
        const data = chs[ch] || "";
        const notes = data.match(/../g) || [];
        channelNotes[ch] = notes;
        maxLen = Math.max(maxLen, notes.length);
      }

      // 1小節の最大音符数 maxLen が16未満でも16分単位で判定するために
      // maxLen < 16 でも16分区間4分割は維持
      // 16分単位の音符数（小数点可）
      const sixteenNoteUnit = maxLen / 4;

      // すべてのチャンネルについて最大長に合わせてリスケール
      for (const ch of targets) {
        const notes = channelNotes[ch];
        const rescaled = Array(maxLen).fill("00");
        for (let i = 0; i < notes.length; i++) {
          const idx = Math.floor(i * maxLen / notes.length);
          rescaled[idx] = notes[i];
        }
        channelNotes[ch] = rescaled;
      }

      if (mode === "S") {
        // S乱：単純シャッフル（前の実装通り）
        for (let i = 0; i < maxLen; i++) {
          const activeNotes = [];
          for (const ch of targets) {
            if (channelNotes[ch][i] !== "00") {
              activeNotes.push(channelNotes[ch][i]);
              channelNotes[ch][i] = "00";
            }
          }
          if (activeNotes.length === 0) continue;

          const shuffledChs = [...targets];
          shuffleArray(shuffledChs);
          const shuffledNotes = [...activeNotes];
          shuffleArray(shuffledNotes);

          for (let j = 0; j < shuffledNotes.length; j++) {
            channelNotes[shuffledChs[j]][i] = shuffledNotes[j];
          }
        }
      } else if (mode === "H") {
        // H乱：16分単位区切り連打回避＆直前タイム連打回避あり

        const usedChPer16th = Array(4).fill(null).map(() => new Set());

        for (let i = 0; i < maxLen; i++) {
          const activeNotes = [];
          for (const ch of targets) {
            if (channelNotes[ch][i] !== "00") {
              activeNotes.push(channelNotes[ch][i]);
              channelNotes[ch][i] = "00";
            }
          }
          if (activeNotes.length === 0) continue;

          const current16thIndex = Math.min(Math.floor(i / sixteenNoteUnit), 3);

          shuffleArray(activeNotes);

          for (const note of activeNotes) {
            // 16分区間で未使用かつその時点空きチャンネル
            let candidateChs = targets.filter(ch =>
              !usedChPer16th[current16thIndex].has(ch) && channelNotes[ch][i] === "00"
            );

            // さらに直前タイム(i-1)で同じチャンネル連打しないものだけに絞る
            candidateChs = candidateChs.filter(ch => {
              if (i === 0) return true;
              return channelNotes[ch][i - 1] === "00";
            });

            if (candidateChs.length === 0) {
              // 16分区間の制限なし・直前連打なし候補を探す
              candidateChs = targets.filter(ch =>
                channelNotes[ch][i] === "00" &&
                (i === 0 || channelNotes[ch][i - 1] === "00")
              );
            }

            if (candidateChs.length === 0) {
              // 直前連打も許容し候補探す
              candidateChs = targets.filter(ch => channelNotes[ch][i] === "00");
            }

            if (candidateChs.length > 0) {
              shuffleArray(candidateChs);
              const ch = candidateChs[0];
              channelNotes[ch][i] = note;
              usedChPer16th[current16thIndex].add(ch);
            }
            // 配置できないケースはほぼ無し
          }
        }
      }

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
