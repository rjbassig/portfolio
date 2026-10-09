import pandas as pd

print("PROJECT 1 SCRIPT IS RUNNING")

df = pd.read_csv("grocerydb.csv")

print("Rows, columns:", df.shape)

print("\nProducts by store:")
print(df["store"].value_counts())

processing_by_store = pd.crosstab(
    df["store"],
    df["FPro_class"],
    normalize="index"
) * 100

print("\nProcessing class percentages by store:")
print(processing_by_store.round(1))

category_store = (
    df.assign(ultra_processed=df["FPro_class"] == 3)
      .groupby(["category", "store"])
      .agg(
          products=("name", "size"),
          ultra_processed_pct=("ultra_processed", "mean")
      )
      .reset_index()
)

category_store["ultra_processed_pct"] *= 100

category_store_reliable = category_store[
    category_store["products"] >= 30
].copy()

print("\nHighest ultra-processed category/store combinations:")
print(
    category_store_reliable
    .sort_values("ultra_processed_pct", ascending=False)
    .head(25)
    .to_string(index=False)
)

comparison = category_store_reliable.pivot(
    index="category",
    columns="store",
    values="ultra_processed_pct"
).dropna()

comparison["gap"] = comparison.max(axis=1) - comparison.min(axis=1)

print("\nCategories with the biggest store-to-store processing gap:")
print(
    comparison
    .sort_values("gap", ascending=False)
    .head(25)
    .round(1)
    .to_string()
)

nuts = df[df["category"] == "snacks-nuts-seeds"].copy()

print("\n=== NUTS & SEEDS INVESTIGATION ===")

print("\nNumber of products by store:")
print(nuts["store"].value_counts())

print("\nUltra-processed percentage:")
print(
    (nuts.groupby("store")["FPro_class"]
         .apply(lambda x: (x == 3).mean() * 100))
         .round(1)
)

print("\nMedian FPro score:")
print(nuts.groupby("store")["FPro"].median().round(3))

print("\nFPro classes by store:")
print(pd.crosstab(nuts["store"], nuts["FPro_class"]))

print("\nWhole Foods ultra-processed examples:")
print(
    nuts[
        (nuts["store"] == "WholeFoods") &
        (nuts["FPro_class"] == 3)
    ][["name", "brand", "FPro", "Sugars, total", "Sodium"]]
    .sort_values("FPro", ascending=False)
    .head(20)
    .to_string(index=False)
)

print("\nWalmart minimally processed examples:")
print(
    nuts[
        (nuts["store"] == "Walmart") &
        (nuts["FPro_class"] == 0)
    ][["name", "brand", "FPro", "Sugars, total", "Sodium"]]
    .sort_values("FPro")
    .head(20)
    .to_string(index=False)
)

protein_categories = ["seafood", "sausage-bacon", "meat-packaged"]

protein = df[df["category"].isin(protein_categories)].copy()

print("\n=== MEAT & SEAFOOD INVESTIGATION ===")

# Sample sizes
print("\nProduct counts by category and store:")
print(
    pd.crosstab(protein["category"], protein["store"])
)

protein_rates = (
    protein.assign(ultra_processed=protein["FPro_class"] == 3)
    .groupby(["category", "store"])
    .agg(
        products=("name", "size"),
        ultra_processed_pct=("ultra_processed", "mean"),
        median_FPro=("FPro", "median")
    )
    .reset_index()
)

protein_rates["ultra_processed_pct"] *= 100

print("\nUltra-processed rates and median FPro:")
print(
    protein_rates
    .round({
        "ultra_processed_pct": 1,
        "median_FPro": 3
    })
    .to_string(index=False)
)

for category in protein_categories:
    print(f"\n=== {category.upper()} EXAMPLES ===")

    for store in ["Target", "Walmart", "WholeFoods"]:
        print(f"\n{store}:")
        print(
            protein[
                (protein["category"] == category) &
                (protein["store"] == store)
            ][["name", "brand", "FPro", "FPro_class"]]
            .sort_values("FPro", ascending=False)
            .head(10)
            .to_string(index=False)
        )
        
print("\n=== MEAT & SEAFOOD NUTRITION + PRICE ===")

nutrition_price = (
    protein
    .groupby(["category", "store"])
    .agg(
        products=("name", "size"),
        median_FPro=("FPro", "median"),
        median_price=("price", "median"),
        median_price_per_cal=("price percal", "median"),
        median_protein=("Protein", "median"),
        median_sodium=("Sodium", "median"),
        median_sugar=("Sugars, total", "median")
    )
    .reset_index()
)

print(
    nutrition_price
    .round({
        "median_FPro": 3,
        "median_price": 2,
        "median_price_per_cal": 4,
        "median_protein": 2,
        "median_sodium": 3,
        "median_sugar": 2
    })
    .to_string(index=False)
)

# Visualization part

import matplotlib.pyplot as plt

# ==================================================
# PROJECT 1 — FINAL VISUALIZATION
# ==================================================

plot_data = protein_rates.copy()

categories = [
    "seafood",
    "sausage-bacon",
    "meat-packaged"
]

category_labels = {
    "seafood": "SEAFOOD",
    "sausage-bacon": "SAUSAGE & BACON",
    "meat-packaged": "PACKAGED MEAT"
}

# Editorial palette
background = "#FAF9F5"
ink = "#20201E"
muted = "#77736C"
light = "#D8D4CC"

whole_foods = "#197A4A"
target = "#85827F"
walmart = "#343432"


def rate(category, store):
    return plot_data[
        (plot_data["category"] == category) &
        (plot_data["store"] == store)
    ]["ultra_processed_pct"].iloc[0]


# ==================================================
# CANVAS
# ==================================================

fig, ax = plt.subplots(figsize=(14, 8))

fig.patch.set_facecolor(background)
ax.set_facecolor(background)

y_positions = {
    "seafood": 2.24,
    "sausage-bacon": 1.30,
    "meat-packaged": 0.40
}


# ==================================================
# TITLE
# ==================================================

fig.text(
    0.095,
    0.930,
    "WHOLE FOODS HAS THE LOWEST ULTRA-PROCESSED SHARE\n"
    "ACROSS THREE MEAT CATEGORIES",
    fontsize=26,
    fontweight="bold",
    color=ink,
    ha="left",
    va="top",
    linespacing=0.92
)


# ==================================================
# SUBTITLE
# Explicitly describes the transformation for rubric
# ==================================================

fig.text(
    0.095,
    0.815,
    "Share of products classified as NOVA 4 within each store and category.",
    fontsize=11.5,
    color=muted,
    ha="left",
    va="top"
)


# ==================================================
# CATEGORY ROWS
# ==================================================

for category in categories:

    y = y_positions[category]

    wf = rate(category, "WholeFoods")
    tg = rate(category, "Target")
    wm = rate(category, "Walmart")

    values = [wf, tg, wm]

    # Category label
    ax.text(
        0,
        y,
        category_labels[category],
        fontsize=11.5,
        fontweight="bold",
        color=ink,
        ha="left",
        va="center"
    )

    # Range connector
    ax.plot(
        [min(values), max(values)],
        [y, y],
        color=light,
        linewidth=2.2,
        solid_capstyle="round",
        zorder=1
    )

    # Whole Foods is intentionally emphasized
    ax.scatter(
        wf,
        y,
        s=245,
        color=whole_foods,
        edgecolor=background,
        linewidth=2.2,
        zorder=4
    )

    # Target
    ax.scatter(
        tg,
        y,
        s=135,
        color=target,
        edgecolor=background,
        linewidth=1.8,
        zorder=4
    )

    # Walmart
    ax.scatter(
        wm,
        y,
        s=135,
        color=walmart,
        edgecolor=background,
        linewidth=1.8,
        zorder=4
    )


# ==================================================
# SEAFOOD — HERO COMPARISON
# ==================================================

seafood_y = y_positions["seafood"]

wf_seafood = rate("seafood", "WholeFoods")
tg_seafood = rate("seafood", "Target")
wm_seafood = rate("seafood", "Walmart")

seafood_gap = wm_seafood - wf_seafood


# Whole Foods
ax.text(
    wf_seafood,
    seafood_y - 0.15,
    f"{wf_seafood:.1f}%",
    fontsize=14,
    fontweight="bold",
    color=whole_foods,
    ha="center",
    va="top"
)

ax.text(
    wf_seafood,
    seafood_y - 0.34,
    "Whole Foods",
    fontsize=9.5,
    color=whole_foods,
    ha="center",
    va="top"
)


# Target
ax.text(
    tg_seafood,
    seafood_y - 0.15,
    f"{tg_seafood:.1f}%",
    fontsize=11,
    fontweight="bold",
    color=target,
    ha="center",
    va="top"
)

ax.text(
    tg_seafood,
    seafood_y - 0.31,
    "Target",
    fontsize=9,
    color=target,
    ha="center",
    va="top"
)


# Walmart
ax.text(
    wm_seafood,
    seafood_y - 0.15,
    f"{wm_seafood:.1f}%",
    fontsize=11,
    fontweight="bold",
    color=walmart,
    ha="center",
    va="top"
)

ax.text(
    wm_seafood,
    seafood_y - 0.31,
    "Walmart",
    fontsize=9,
    color=walmart,
    ha="center",
    va="top"
)


# ==================================================
# SEAFOOD GAP
# ==================================================

bracket_y = seafood_y + 0.34

ax.plot(
    [wf_seafood, wm_seafood],
    [bracket_y, bracket_y],
    color=whole_foods,
    linewidth=1.5,
    zorder=3
)

ax.plot(
    [wf_seafood, wf_seafood],
    [bracket_y - 0.045, bracket_y + 0.045],
    color=whole_foods,
    linewidth=1.5
)

ax.plot(
    [wm_seafood, wm_seafood],
    [bracket_y - 0.045, bracket_y + 0.045],
    color=whole_foods,
    linewidth=1.5
)

ax.text(
    (wf_seafood + wm_seafood) / 2,
    bracket_y + 0.065,
    f"{seafood_gap:.0f} PERCENTAGE-POINT GAP",
    fontsize=10,
    fontweight="bold",
    color=whole_foods,
    ha="center",
    va="bottom"
)


# ==================================================
# INTEGRATED SEAFOOD CALLOUT
# ==================================================

# Short leader line from Walmart's seafood point
ax.annotate(
    "Walmart's share is more than\n"
    "twice Whole Foods' in seafood",
    xy=(wm_seafood, seafood_y),
    xytext=(67, seafood_y + 0.03),
    textcoords="data",
    fontsize=10.5,
    color=ink,
    ha="left",
    va="center",
    linespacing=1.25,
    arrowprops=dict(
        arrowstyle="-",
        color="#AAA69F",
        linewidth=0.9,
        shrinkA=7,
        shrinkB=7
    )
)


# ==================================================
# SUPPORTING ROW LABELS
# ==================================================

def supporting_labels(category):

    y = y_positions[category]

    wf = rate(category, "WholeFoods")
    tg = rate(category, "Target")
    wm = rate(category, "Walmart")

    # Whole Foods
    ax.text(
        wf,
        y - 0.14,
        f"{wf:.1f}%",
        fontsize=12.5,
        fontweight="bold",
        color=whole_foods,
        ha="center",
        va="top"
    )

    ax.text(
        wf,
        y - 0.31,
        "Whole Foods",
        fontsize=9,
        color=whole_foods,
        ha="center",
        va="top"
    )

    # Target above-left
    ax.annotate(
        f"{tg:.1f}%  Target",
        xy=(tg, y),
        xytext=(-7, 16),
        textcoords="offset points",
        fontsize=9.5,
        color=target,
        ha="right",
        va="bottom"
    )

    # Walmart below-right
    ax.annotate(
        f"Walmart  {wm:.1f}%",
        xy=(wm, y),
        xytext=(7, -16),
        textcoords="offset points",
        fontsize=9.5,
        color=walmart,
        ha="left",
        va="top"
    )


supporting_labels("sausage-bacon")
supporting_labels("meat-packaged")


# ==================================================
# AXIS
# ==================================================

ax.set_xlim(0, 100)
ax.set_ylim(-0.08, 2.83)

ax.set_yticks([])

ax.set_xticks([
    0,
    25,
    50,
    75,
    100
])

ax.set_xticklabels(
    ["0%", "25%", "50%", "75%", "100%"],
    fontsize=9.5,
    color=muted
)

# Only useful reference guides
for x in [25, 50, 75]:

    ax.axvline(
        x,
        color="#E5E2DB",
        linewidth=0.7,
        zorder=0
    )

ax.set_xlabel(
    "SHARE OF PRODUCTS CLASSIFIED AS ULTRA-PROCESSED",
    fontsize=9.5,
    fontweight="bold",
    color=muted,
    labelpad=15
)


# ==================================================
# REMOVE NON-DATA INK
# ==================================================

for spine in ax.spines.values():
    spine.set_visible(False)

ax.tick_params(
    axis="x",
    length=0,
    pad=7
)


# ==================================================
# LAYOUT
# ==================================================

plt.subplots_adjust(
    left=0.095,
    right=0.94,
    top=0.755,
    bottom=0.12
)


# ==================================================
# EXPORT
# ==================================================

plt.savefig(
    "project1_FINAL.png",
    dpi=300,
    bbox_inches="tight",
    facecolor=fig.get_facecolor()
)

plt.close(fig)

print("Final visualization saved to project1_FINAL.png")