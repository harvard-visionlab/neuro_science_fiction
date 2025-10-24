clear all;
close all;

fid=fopen('SemanticFeatureRatings.csv','r');

thisLine=0;
itemCount=0;
itemNames=[];
featureNames=[];
R=[]; % will be a matrix, rows are features, columns are items
ratings=[]; % will be a struct, field for each item, subfield for each feature
while 1
    % get next line
    tline = fgetl(fid);
    
    str='Features for ';
    if strfind(tline,str)
        item=tline(length(str)+1:strfind(tline,':')-1);
        itemCount=itemCount+1;
        featureCount=0;
        itemNames{itemCount}=item;
    elseif ~isempty(tline) & tline ~= -1
        featureCount=featureCount+1;
        feature=tline(2:strfind(tline,'(')-2);
        feature(strfind(feature,' '))='_';
        value=str2num(tline(strfind(tline,'(')+1:strfind(tline,')')-1));
        ratings.(feature)(itemCount)=value;
    elseif tline==-1
        break;
    end

end

featureNames=fieldnames(ratings);
for f=1:length(featureNames)
    R(f,:)=ratings.(featureNames{f});
end

fclose(fid);
save('ratingData.mat','ratings','R','itemNames','featureNames');


