function [predictedFeatures,protoFeatures]=predictFeaturesFromBrainData(protoBrainData,protoTypeFeatures,testBrainData)

keyboard

numProto=size(protoBrainData,1);
numTest=size(testBrainData,1);

% include prototypes in "test_sets" variable (later dropped)
protoTypes=1:numProto;
test_sets(1:numProto,:)=protoBrainData;
test_sets(numProto+1:numProto+numTest,:)=testBrainData;


for t=1:size(test_sets,1)

    % current data set
    cdata=test_sets(t,:);
    
    % compare to each prototype
    for i=1:numProto
        pdata=protoBrainData(i,:);
        d(t,i)=sqrt(sum((cdata-pdata).^2));
    end

end

%Normalize
% for i=1:size(d,1) 
%     d(i,:)=d(i,:)/max(d(i,:));
% end
% for i=1:size(d,2)
%     d(:,i)=d(:,i)/max(d(:,i));
% end

% =========================================================================
% simple least squares extrapolation
% =========================================================================

% Matlabs standard least squares inverse "\" is used to extrapolate the
% tracking points from the prototypes, but you favorite correlation can
% also be used...

tmp=d*(d(protoTypes,:)\protoTypeFeatures);

protoFeatures=tmp(1:numProto,:);
predictedFeatures=tmp(numProto+1:end,:);



