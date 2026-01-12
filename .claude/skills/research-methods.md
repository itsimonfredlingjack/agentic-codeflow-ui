---
name: research-methods
description: Scientific research methodologies and literature review patterns. Use when conducting research, analyzing papers, or building RAG systems for knowledge retrieval.
source: K-Dense-AI/claude-scientific-skills
---

# Research Methods

## Literature Review Workflow

### 1. Define Research Question

```markdown
PICO Framework (for systematic reviews):
- Population: Who/what is being studied?
- Intervention: What action or exposure?
- Comparison: Against what alternative?
- Outcome: What results are measured?
```

### 2. Search Strategy

```python
# Multi-database search pattern
databases = {
    "pubmed": "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/",
    "openalex": "https://api.openalex.org/",
    "semantic_scholar": "https://api.semanticscholar.org/",
}

# Boolean query construction
query = "(machine learning OR deep learning) AND (drug discovery) AND (2020:2024[pdat])"
```

### 3. Systematic Screening

```markdown
Inclusion Criteria:
- [ ] Peer-reviewed
- [ ] Published within date range
- [ ] Addresses research question
- [ ] Full text available

Exclusion Criteria:
- [ ] Review articles (unless meta-analysis)
- [ ] Non-English
- [ ] Retracted
```

## RAG for Research

### Document Chunking Strategy

```typescript
interface Chunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    section: string;  // abstract, methods, results, discussion
    page?: number;
    citations?: string[];
  };
}

// Semantic chunking for papers
function chunkPaper(paper: Paper): Chunk[] {
  return [
    { section: 'abstract', content: paper.abstract },
    { section: 'introduction', content: paper.intro },
    { section: 'methods', content: paper.methods },
    { section: 'results', content: paper.results },
    { section: 'discussion', content: paper.discussion },
  ].map((s, i) => ({
    id: `${paper.doi}-${i}`,
    content: s.content,
    metadata: { source: paper.doi, section: s.section }
  }));
}
```

### Retrieval Patterns

```typescript
// Hybrid search: keyword + semantic
async function hybridSearch(query: string, k: number = 10) {
  const [keywordResults, semanticResults] = await Promise.all([
    bm25Search(query, k * 2),
    vectorSearch(await embed(query), k * 2),
  ]);

  // Reciprocal rank fusion
  return fuseResults(keywordResults, semanticResults, k);
}

// Multi-query expansion
async function expandedSearch(query: string) {
  const variations = await generateQueryVariations(query);
  // ["original query", "synonym variation", "related concept"]

  const allResults = await Promise.all(
    variations.map(v => hybridSearch(v))
  );

  return deduplicateAndRank(allResults.flat());
}
```

### Citation Verification

```typescript
// Verify claims against sources
interface Claim {
  statement: string;
  sources: string[];
  confidence: 'high' | 'medium' | 'low';
}

async function verifyClaim(claim: string, context: Chunk[]): Promise<Claim> {
  const supporting = context.filter(c =>
    semanticSimilarity(claim, c.content) > 0.7
  );

  return {
    statement: claim,
    sources: supporting.map(s => s.metadata.source),
    confidence: supporting.length >= 2 ? 'high' :
                supporting.length === 1 ? 'medium' : 'low'
  };
}
```

## Data Analysis Patterns

### Statistical Summary

```python
import pandas as pd
import scipy.stats as stats

def analyze_results(df: pd.DataFrame, groups: str, metric: str):
    """Standard statistical comparison between groups."""

    # Descriptive stats
    summary = df.groupby(groups)[metric].agg(['mean', 'std', 'count'])

    # Normality test
    for group in df[groups].unique():
        data = df[df[groups] == group][metric]
        _, p = stats.shapiro(data)
        print(f"{group} normality p={p:.4f}")

    # Group comparison
    group_data = [df[df[groups] == g][metric] for g in df[groups].unique()]

    if len(group_data) == 2:
        stat, p = stats.mannwhitneyu(*group_data)
        test = "Mann-Whitney U"
    else:
        stat, p = stats.kruskal(*group_data)
        test = "Kruskal-Wallis"

    return {"test": test, "statistic": stat, "p_value": p, "summary": summary}
```

### Visualization Templates

```python
import matplotlib.pyplot as plt
import seaborn as sns

def publication_figure(data, x, y, hue=None):
    """Generate publication-ready figure."""

    plt.figure(figsize=(8, 6), dpi=300)
    sns.set_style("whitegrid")
    sns.set_context("paper", font_scale=1.2)

    if hue:
        sns.boxplot(data=data, x=x, y=y, hue=hue)
    else:
        sns.boxplot(data=data, x=x, y=y)

    plt.xlabel(x.replace("_", " ").title())
    plt.ylabel(y.replace("_", " ").title())
    plt.tight_layout()

    return plt.gcf()
```

## Knowledge Synthesis

### Evidence Table

```markdown
| Study | n | Design | Key Finding | Quality |
|-------|---|--------|-------------|---------|
| Smith 2023 | 150 | RCT | 25% improvement | High |
| Jones 2022 | 80 | Cohort | Positive association | Medium |
```

### Gap Analysis

```markdown
## Current Knowledge
- [x] X is associated with Y (strong evidence)
- [x] Mechanism involves pathway Z (moderate evidence)
- [ ] Long-term effects unknown
- [ ] No studies in population P

## Research Opportunities
1. Longitudinal study needed
2. Population P underrepresented
3. Mechanism Z needs validation
```

## API Reference

### OpenAlex

```python
import requests

def search_openalex(query: str, per_page: int = 25):
    response = requests.get(
        "https://api.openalex.org/works",
        params={
            "search": query,
            "per_page": per_page,
            "sort": "cited_by_count:desc"
        }
    )
    return response.json()["results"]
```

### PubMed

```python
from Bio import Entrez

Entrez.email = "your@email.com"

def search_pubmed(query: str, max_results: int = 100):
    handle = Entrez.esearch(db="pubmed", term=query, retmax=max_results)
    record = Entrez.read(handle)
    return record["IdList"]
```
