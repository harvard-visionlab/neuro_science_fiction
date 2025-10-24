function s=cosineSimilarity(x,y)

x=x/sum(x);
y=y/sum(y);
s=dot(x,y);