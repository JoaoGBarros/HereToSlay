package org.br.heretoslay.engine;

import java.util.List;

/** A card's effect, expressed as the ordered steps it adds to the match flow. */
@FunctionalInterface
public interface Script {
    List<Runnable> steps(Ctx ctx);
}
