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
    const num16th = 4; // 小節を16分音符4区間に分割

    // 小節を跨いだ16分区間単位で使われたチャンネル管理（Map: global16thIndex -> Set<channel>）
    const usedChPer16th = new Map();
    // 直前タイム(globalIndex-1)で使ったチャンネル管理
    const lastUsedChannelAtIndex = new Map();

    let globalIndex = 0; // 小節を跨いだ全体のタイムインデックス

    for (const [bar, chs] of measures.entries()) {
      const channelNotes = {};
      let maxLen = 0;
      for (const ch of targets) {
        const data = chs[ch] || "";
        const notes = data.match(/../g) || [];
        channelNotes[ch] = notes;
        maxLen = Math.max(maxLen, notes.length);
      }

      // 小節内を4区間に分割したときの１区間の長さ
      const sixteenNoteUnit = maxLen / num16th;

      // リスケール（最大長に合わせて音符配置）
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
        // S乱：単純シャッフル
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
        // H乱：16分区間内の連打を避ける + 直前タイムの連打も避ける（小節またぎ対応）

        for (let i = 0; i < maxLen; i++, globalIndex++) {
          const activeNotes = [];
          for (const ch of targets) {
            if (channelNotes[ch][i] !== "00") {
              activeNotes.push(channelNotes[ch][i]);
              channelNotes[ch][i] = "00";
            }
          }
          if (activeNotes.length === 0) continue;

          // global16thIndexはglobalIndexを16分区間単位で計算
          const global16thIndex = Math.floor(globalIndex / sixteenNoteUnit);

          // 16分区間の使用チャンネルセットを取得（なければ初期化）
          if (!usedChPer16th.has(global16thIndex)) {
            usedChPer16th.set(global16thIndex, new Set());
          }
          const usedSet = usedChPer16th.get(global16thIndex);

          shuffleArray(activeNotes);

          for (const note of activeNotes) {
            // 16分区間内で未使用かつ空きチャンネルを探す
            let candidateChs = targets.filter(ch =>
              !usedSet.has(ch) &&
              channelNotes[ch][i] === "00"
            );

            // さらに直前タイム(globalIndex-1)の連打を避ける
            candidateChs = candidateChs.filter(ch =>
              lastUsedChannelAtIndex.get(globalIndex - 1) !== ch
            );

            if (candidateChs.length === 0) {
              // 16分区間制限を解除し直前連打回避だけで候補探す
              candidateChs = targets.filter(ch =>
                channelNotes[ch][i] === "00" &&
                lastUsedChannelAtIndex.get(globalIndex - 1) !== ch
              );
            }

            if (candidateChs.length === 0) {
              // 直前連打も許容して候補を探す
              candidateChs = targets.filter(ch => channelNotes[ch][i] === "00");
            }

            if (candidateChs.length > 0) {
              shuffleArray(candidateChs);
              const ch = candidateChs[0];
              channelNotes[ch][i] = note;
              usedSet.add(ch);
              lastUsedChannelAtIndex.set(globalIndex, ch);
            }
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
