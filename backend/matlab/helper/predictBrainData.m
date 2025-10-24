function Results=predictBrainData(subnum,featureFileName,fmriFileName,prefs)

%% predict brain data from semantic features
% glm: weights on the features

%% Basic setup, loading, checking, normalizing data

addpath('helper');

% load the rating data
load(featureFileName);

% make sure all variables are oriented correctly (columns/rows)
if (size(featureNames,2)<size(featureNames,1))
    featureNames=featureNames';
end

if (size(itemNames,1)<size(itemNames,2))
    itemNames=itemNames';
end
ratingItemNames=itemNames;

if size(R,1) ~= size(itemNames,1)
    R=R';
end
R=zscore(R);

% use only features set in prefs list
if ~isempty(prefs.featureSet)
    R=R(:,prefs.featureSet);
    featureNames={featureNames{prefs.featureSet}};
end
numFeatures=length(featureNames);

% sanity check, scramble the features
if strcmp(prefs.ratings,'random')
    for i=1:size(R,2)
        R(:,i)=Shuffle(R(:,i));
    end
end

% load the fmri data
load(fmriFileName);
brainItemNames=itemName;

% check to make sure the rating data and the brain data have the items in
% the same order!
for i=1:length(ratingItemNames)
    if ~(strcmp(ratingItemNames{i},brainItemNames{i}))
        ratingItemNames{i}
        brainItemNames{i}
        disp('items in different order!');
        keyboard;
    end
end
disp('Item order matched...');

% normalize the data
D=mean(D,3); % average data across repetitions
D=zscore(D,[],1); % z score the data
%D=D-repmat(mean(D),[size(D,1) 1]); % subtract the mean across words
N=min(prefs.numVoxels,size(D,2));

if strcmp(prefs.voxelSelection,'across')
    sortIdx=getReliableVoxelsAcrossSubjects(subnum,prefs.voxelRelType);
end

D=D(:,sortIdx(1:N)); % take the N most reliable voxels

%% predict brain data for all possible pairs

clc;

% variables to keep track of things
c=0
gotItRight=[];
sameCat=[];
numItems=size(D,1);
itemPair=[];
accByFeature=[];
allB=[];

% loop through all pairs
for i=1:numItems-1
    for j=i:numItems
        if (i~=j)
            
            c=c+1;
            disp(sprintf('subnum=%d, numvox=%d, items=[%d,%d], pairNum=%d: accuracy so far = %3.2f',subnum,prefs.numVoxels,i,j,c,mean(gotItRight)));
            
            itemPair(:,c)=[i; j];
            
            % get test and train items
            allItems=1:numItems;
            testItems=[i j];
            trainItems=allItems;
            trainItems(testItems)=[];
            
            % get test and train data
            trainBrainData=D(trainItems,:);
            trainItemFeatures=R(trainItems,:);
            testItemFeatures=R(testItems,:);
            actualBrainData=D(testItems,:);
            
            sameCat(c)=double(categoryNum(i)==categoryNum(j));
            
            %predictedBrainData=predictBrainDataFromFeatures(trainBrainData,trainItemFeatures,testItemFeatures);
            [b] = glmfitmulti(trainItemFeatures,trainBrainData);

            allB(:,:,c)=b;
            for item=1:length(testItems)
                features=repmat([1; testItemFeatures(item,:)'],[1 size(trainBrainData,2)]);
                predictedBrainData(item,:) = sum(b.*features,1);
            end
            
            % compare actual to predicted brain data for test items
            gotItRight(c)=compareActualPredicted(actualBrainData,predictedBrainData,prefs);
            
            % make predictions for each individual feature
            if strcmp(prefs.testFeatures,'yes')
                for f=1:length(featureNames)
                    [b] = glmfitmulti(trainItemFeatures(:,f),trainBrainData);
                    for item=1:length(testItems)
                        features=repmat([1; testItemFeatures(item,f)'],[1 size(trainBrainData,2)]);
                        predictedBrainData(item,:) = sum(b.*features,1);
                    end
                    accByFeature(c,f)=compareActualPredicted(actualBrainData,predictedBrainData,prefs);
                end
            end
            
        end
        
    end
    
end

% keyboard;

%% combine results in a struct to return

mean(gotItRight)
mean(gotItRight(sameCat==1))
mean(gotItRight(sameCat==0))

Results.whichVoxels=sortIdx(1:N);
Results.voxelReliability=voxelReliability(sortIdx(1:N));
Results.itemPair=itemPair;
%Results.betaByPair=allB;
Results.betaAve=mean(allB,3);
Results.sameCat=sameCat;
Results.gotItRight=gotItRight;
Results.accuracyOverall=mean(gotItRight);
Results.accuracySameCat=mean(gotItRight(sameCat==1));
Results.accuracyDiffCat=mean(gotItRight(sameCat==0));
Results.accByFeature=accByFeature;
Results.aveAccByFeature=mean(accByFeature);
Results.usedVoxels=find(meta.coordToCol);
Results.brainSize=size(meta.coordToCol);

function correct=compareActualPredicted(a,p,prefs)

dis11=computeDissimilarity(p(1,:)',a(1,:)',prefs.metric);
dis22=computeDissimilarity(p(2,:)',a(2,:)',prefs.metric);
dis12=computeDissimilarity(p(1,:)',a(2,:)',prefs.metric);
dis21=computeDissimilarity(p(2,:)',a(1,:)',prefs.metric);

if strcmp(prefs.accuracyMeasure,'combo')
    % sum the dissimilarity scores for the 2 right and 2 wrong
    % comparisons
    ddRightCombo=dis11+dis22;
    ddWrongCombo=dis12+dis21;
    
    % got it right if the dissimilarity score for the "right combo"
    % is lower
    correct=double(ddRightCombo<ddWrongCombo);
    
elseif strcmp(prefs.accuracyMeasure,'individual')
    correct=(double(dis11<dis12) + double(dis22<dis21))/2; % percent correct, individual predictions
end







