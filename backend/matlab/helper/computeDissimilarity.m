function dis=computeDissimilarity(x,y,simType)
% all of these can be interpreted as "larger number, greater difference"
% correlation, returns 1-r, where r is the pearson correlation (so it's "dissimilarity")
% SSE, returns the sum of the squared differences
% distance, returns euclidean distance (sqrt of SSE)
% icc, intraclass correlation
% cosine, returns the 1 - 'cosine similarity'

if strcmp(simType,'correlation')
    if (size(x,1)<size(x,2))
        x=x';
    end
    if (size(x,1)<size(x,2))
        y=y';
    end
    dis=1-corr(x,y);
elseif strcmp(simType,'SSE')
    dis=sum((x-y).^2);
elseif strcmp(simType,'distance')
    dis=sqrt(sum((x-y).^2));
elseif (strcmp(simType,'icc'))
    if (size(x,1)<size(x,2))
        x=x';
    end
    if (size(x,1)<size(x,2))
        y=y';
    end
    dis=1-icc([x y]);
elseif strcmp(simType,'cosine')
        
    dotProd=dot(x,y);
    magX=sqrt(dot(x,x));
    magY=sqrt(dot(y,y));
    sim=dotProd/(magX*magY);
    dis=1-sim;
    
    if (size(x,2)<size(x,1))
        x=x';
    end
    if (size(x,2)<size(x,1))
        y=y';
    end
    %dis=pdist([x; y],'cosine');
    
end