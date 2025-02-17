---
title: "Exploring Data with Jupyter Notebook"
date: 2025-02-16
categories: [Python, Data Science, Jupyter]
---

# Exploring Data with Jupyter Notebook

**Author:** John Doe | *Published on:* **February 16, 2025**

Jupyter Notebooks are an essential tool for data scientists and developers. In this article, we'll explore some basic data manipulation using Python.

## Why Use Jupyter Notebooks?

Jupyter allows us to:

- Write code in an interactive environment.
- Visualize data within the notebook.
- Share our work easily.

---

## Sample Notebook Code

Here’s an example of how to create a simple DataFrame using `pandas`:

```python
import pandas as pd

# Creating a small dataset
data = {
    "Name": ["Alice", "Bob", "Charlie"],
    "Age": [25, 30, 35],
    "City": ["New York", "Los Angeles", "Chicago"]
}

df = pd.DataFrame(data)

# Display the DataFrame
df
